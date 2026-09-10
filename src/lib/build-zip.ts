import sharp from "sharp";
import archiver from "archiver";
import { PassThrough, Readable } from "stream";
import { readAsset } from "@/lib/storage";
import type { ImageEntry } from "@/lib/section-images";
import { cmsLocalePath } from "@/lib/utils";

export interface ZipGroup {
  // "" pour l'export simple (comportement historique) — un chemin type
  // "macaron/Rentrée scolaire" pour l'export groupé multi-briefs.
  folderPrefix: string;
  images: ImageEntry[];
  year: number;
  week: number;
  locale: string;
}

// Nombre d'images préparées en parallèle. sharp travaille dans un threadpool
// natif, donc paralléliser accélère réellement ; on reste bas pour ne pas
// garder trop d'images décodées en mémoire en même temps.
const PREPARE_CONCURRENCY = 4;

interface ZipEntry {
  name: string;
  buffer: Buffer;
  /** true = pas de compression deflate (déjà compressé, cf. vidéos). */
  store?: boolean;
}

/** Chemin CMS du fichier, sans le nom : doit matcher resolveCmsFolder côté export HTML. */
function subFolderFor(img: ImageEntry, group: ZipGroup): string {
  const imgWk = String(img.imageWeek ?? group.week).padStart(2, "0");
  // Locale en minuscule, "be" pour BEFR/BENL (doit matcher le <img src>
  // exporté). Racine "homepage" par défaut, surchargeable par template
  // (ex: "banner" pour cat-banner) via img.folder.
  const folder = img.folder ?? "homepage";
  const localeSegment = img.noLocale ? "" : `/${cmsLocalePath(group.locale)}`;
  // Chemin personnalisé : remplace "{folder}/{année}/wk{semaine}" (la semaine
  // n'en fait alors plus partie, cf. resolveCmsFolder).
  const baseFolder = img.customFolder || `${folder}/${group.year}/wk${imgWk}`;
  return `${group.folderPrefix ? `${group.folderPrefix}/` : ""}${baseFolder}${localeSegment}`;
}

interface PreparedImage {
  entries: ZipEntry[];
  /** Nom du fichier attendu quand la préparation a échoué. */
  failed?: string;
}

/**
 * Télécharge et convertit une image en les fichiers à zipper. Une image en
 * échec n'interrompt pas l'export, mais elle est remontée à l'appelant pour
 * que l'utilisateur en soit averti — un ZIP silencieusement incomplet
 * finirait intégré au CMS sans que personne ne le remarque.
 */
async function prepareImage(img: ImageEntry, group: ZipGroup): Promise<PreparedImage> {
  const subFolder = subFolderFor(img, group);
  try {
    const buffer = await readAsset(img.imageUrl);

    if (img.isVideo) {
      // Copiée telle quelle, pas de passage par sharp. store:true = pas de
      // tentative de compression deflate — une vidéo est déjà compressée
      // (données quasi incompressibles), zlib niveau 9 dessus peut prendre
      // plusieurs minutes pour rien.
      return { entries: [{ name: `${subFolder}/${img.baseName}.mp4`, buffer, store: true }] };
    }

    // Un seul sharp() pour les deux sorties : les clones partagent l'entrée au
    // lieu de la décoder deux fois.
    const source = sharp(buffer);
    const pipeline = () => {
      const p = source.clone();
      if (img.width && img.height) p.resize(img.width, img.height, { fit: "cover" });
      return p.flatten({ background: { r: 255, g: 255, b: 255 } });
    };

    const entries: ZipEntry[] = [
      { name: `${subFolder}/${img.baseName}.jpg`, buffer: await pipeline().jpeg({ quality: 85 }).toBuffer() },
    ];

    // jpgOnly (cat-banner) : pas de <picture>/<source webp> côté HTML, donc
    // pas de variante webp inutile dans le zip.
    if (!img.jpgOnly) {
      entries.push({
        name: `${subFolder}/${img.baseName}.webp`,
        buffer: await pipeline().webp({ quality: 85 }).toBuffer(),
      });
    }
    return { entries };
  } catch (err) {
    console.error(`Failed to process image for ${img.baseName}:`, err);
    return { entries: [], failed: `${subFolder}/${img.baseName}` };
  }
}

export interface PreparedZip {
  entries: ZipEntry[];
  /** Fichiers qui n'ont pas pu être produits (asset illisible, image corrompue). */
  failed: string[];
}

/**
 * Télécharge et convertit toutes les images (par lots en parallèle), sans
 * toucher à l'archive. Séparé de `streamZip` ci-dessous pour que l'appelant
 * connaisse `failed` — et puisse donc décider d'un 502 « tout a échoué » —
 * avant qu'un seul octet ne parte vers le client : une fois le flux de
 * réponse ouvert, il n'est plus possible de basculer vers une erreur JSON.
 */
export async function prepareZip(groups: ZipGroup[]): Promise<PreparedZip> {
  const entries: ZipEntry[] = [];
  const failed: string[] = [];

  for (const group of groups) {
    for (let i = 0; i < group.images.length; i += PREPARE_CONCURRENCY) {
      const batch = group.images.slice(i, i + PREPARE_CONCURRENCY);
      const prepared = await Promise.all(batch.map((img) => prepareImage(img, group)));
      for (const item of prepared) {
        if (item.failed) failed.push(item.failed);
        entries.push(...item.entries);
      }
    }
  }

  return { entries, failed };
}

/**
 * Construit le ZIP et le renvoie comme flux — pas de `Buffer.concat` d'une
 * archive entière en mémoire, qui plafonnerait la réponse à 4,5 Mo sur Vercel
 * (limite de toute fonction, streaming excepté). `entries` doit déjà venir de
 * `prepareZip` : à ce stade, on ne fait plus que compresser des buffers déjà
 * en mémoire, donc `archive.finalize()` n'a plus besoin d'être attendu avant
 * de commencer à lire — c'est le client qui devient le drain, ce qui élimine
 * le risque de deadlock documenté ici par le passé (2+ grosses entrées comme
 * des vidéos, jamais lues avant `finalize()`).
 */
export function streamZip({ entries, failed }: PreparedZip): ReadableStream<Uint8Array> {
  const archive = archiver("zip", { zlib: { level: 9 } });
  const passthrough = new PassThrough();
  archive.pipe(passthrough);
  // Une erreur de compression après le début du flux ne peut plus devenir un
  // 502 : elle coupe la réponse, ce que le client voit comme un ZIP tronqué.
  archive.on("error", (err) => passthrough.destroy(err));

  for (const entry of entries) {
    archive.append(entry.buffer, { name: entry.name, store: entry.store });
  }

  // Un fichier de rapport dans l'archive : c'est le seul endroit que
  // l'utilisateur ouvrira forcément s'il manque des visuels.
  if (failed.length > 0) {
    const rapport = [
      "Images absentes de cet export (asset illisible au moment de la génération) :",
      "",
      ...failed.map((f) => `  - ${f}`),
      "",
      "Vérifiez ces visuels dans la médiathèque, puis relancez l'export.",
    ].join("\n");
    archive.append(Buffer.from(rapport, "utf-8"), { name: "_IMAGES-MANQUANTES.txt" });
  }

  // Ne pas attendre : la promesse ne se résout qu'une fois tout drainé, et
  // personne ne lit encore `passthrough` à cet instant.
  void archive.finalize();

  return Readable.toWeb(passthrough) as ReadableStream<Uint8Array>;
}
