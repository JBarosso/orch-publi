import sharp from "sharp";
import archiver from "archiver";
import { PassThrough } from "stream";
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

// Construit le buffer ZIP à partir d'un ou plusieurs groupes d'images. Le
// drain du flux de sortie DOIT démarrer avant (et tourner pendant) les
// archive.append() : archiver met en file d'attente les entrées et attend
// que le flux de sortie soit lu pour passer à la suivante — avec 2+ grosses
// entrées non compressibles (vidéos), ne lire qu'après finalize() bloque
// indéfiniment (deadlock reproduit et confirmé).
export async function buildZipBuffer(groups: ZipGroup[]): Promise<Buffer> {
  const passthrough = new PassThrough();
  const archive = archiver("zip", { zlib: { level: 9 } });
  archive.pipe(passthrough);

  const chunks: Buffer[] = [];
  const drainPromise = (async () => {
    for await (const chunk of passthrough) {
      chunks.push(chunk as Buffer);
    }
  })();

  for (const group of groups) {
    for (const img of group.images) {
      const imgWk = String(img.imageWeek ?? group.week).padStart(2, "0");
      // Chemin CMS : locale en minuscule, "be" pour BEFR/BENL (doit matcher le <img src> exporté)
      const subFolder = `${group.folderPrefix ? `${group.folderPrefix}/` : ""}homepage/${group.year}/wk${imgWk}/${cmsLocalePath(group.locale)}`;

      try {
        const buffer = await readAsset(img.imageUrl);

        if (img.isVideo) {
          // Vidéo : copiée telle quelle, pas de passage par sharp. store:true =
          // pas de tentative de compression deflate — une vidéo est déjà
          // compressée (données quasi incompressibles), zlib niveau 9 dessus
          // peut prendre plusieurs minutes pour rien.
          archive.append(buffer, { name: `${subFolder}/${img.baseName}.mp4`, store: true });
          continue;
        }

        const jpgPipeline = sharp(buffer);
        if (img.width && img.height) {
          jpgPipeline.resize(img.width, img.height, { fit: "cover" });
        }
        const jpgBuffer = await jpgPipeline
          .flatten({ background: { r: 255, g: 255, b: 255 } })
          .jpeg({ quality: 85 })
          .toBuffer();

        const webpPipeline = sharp(buffer);
        if (img.width && img.height) {
          webpPipeline.resize(img.width, img.height, { fit: "cover" });
        }
        const webpBuffer = await webpPipeline
          .flatten({ background: { r: 255, g: 255, b: 255 } })
          .webp({ quality: 85 })
          .toBuffer();

        archive.append(jpgBuffer, { name: `${subFolder}/${img.baseName}.jpg` });
        archive.append(webpBuffer, { name: `${subFolder}/${img.baseName}.webp` });
      } catch (err) {
        console.error(`Failed to process image for ${img.baseName}:`, err);
      }
    }
  }

  await archive.finalize();
  await drainPromise;
  return Buffer.concat(chunks);
}
