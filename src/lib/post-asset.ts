import { upload } from "@vercel/blob/client";
import { v4 as uuidv4 } from "uuid";
import type { AssetType } from "@/types";
import { ASSET_SPECS, normalizeAssetLabel, resolveAssetType } from "@/lib/upload-specs";
import { isLocalModeEnabled } from "@/lib/local-mode";
import { processUpload } from "@/lib/image-pipeline";
import { localImageUrl, saveLocalImage, toAsset, type LocalImageRecord } from "@/lib/local-images";

// Envoi d'un fichier vers la médiathèque, partagé par la fenêtre d'upload et
// le collage d'une capture dans le moodboard.

// Upload direct navigateur → Vercel Blob, sous tmp/ (cf. src/lib/storage.ts).
// Sur Vercel, une route refuse tout corps de requête au-delà de 4,5 Mo
// (erreur 413) : c'est ce qui bloquait les TIFF, les vidéos et les images
// lourdes. Renvoie null si l'upload direct est indisponible (dev local sans
// Blob) : l'appelant envoie alors le fichier à la route, comme avant.
export async function uploadToTemp(body: Blob, contentType: string): Promise<string | null> {
  try {
    const blob = await upload("tmp/upload", body, {
      access: "public",
      handleUploadUrl: "/api/assets/blob-token",
      contentType,
      // Envoi en parties parallèles avec reprise, pour les gros TIFF.
      multipart: body.size > 100 * 1024 * 1024,
    });
    return blob.url;
  } catch (err) {
    console.warn("Upload direct indisponible, envoi par la route :", err);
    return null;
  }
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

export interface AssetFields {
  label: string;
  week: number | null;
  year: number | null;
  type: AssetType;
  fromTiff?: boolean;
  /** URL d'origine si l'image provient d'un glisser-déposer web (ex: SharePoint) */
  originUrl?: string | null;
}

/**
 * Mode local : l'image est traitée dans le navigateur, avec les mêmes règles
 * que le serveur (cf. image-pipeline.ts), puis rangée sur ce poste. Réponse
 * de même forme que /api/assets, pour que les appelants n'aient rien à savoir.
 */
async function postLocalAsset(file: Blob, fields: AssetFields): Promise<Response> {
  const json = (body: unknown, status: number) =>
    new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
  const type = resolveAssetType(fields.type);
  const spec = ASSET_SPECS[type];
  if (spec.kind === "video") {
    return json({ error: "Les vidéos ne sont pas hébergées : renseignez leur adresse dans la section." }, 400);
  }
  try {
    const processed = await processUpload(file, spec);
    const id = uuidv4();
    const record: LocalImageRecord = {
      id,
      url: localImageUrl(id, processed.ext),
      blob: processed.blob,
      mimeType: processed.mimeType,
      label: normalizeAssetLabel(fields.label),
      type,
      week: fields.week,
      year: fields.year,
      originUrl: fields.originUrl ?? null,
      createdAt: Date.now(),
    };
    await saveLocalImage(record);
    return json(toAsset(record), 201);
  } catch (err) {
    console.error("Traitement local de l'image impossible :", err);
    const message = err instanceof Error && err.message.includes("navigateur") ? err.message : null;
    return json({ error: message ?? "Impossible de traiter cette image dans le navigateur" }, 500);
  }
}

/**
 * Crée l'asset et renvoie la réponse brute de /api/assets : l'appelant garde
 * la main sur l'affichage de l'erreur. Seule l'URL du fichier transite par la
 * route quand l'upload direct est disponible, quel que soit son poids.
 */
export async function postAsset(file: Blob, fields: AssetFields): Promise<Response> {
  if (isLocalModeEnabled()) return postLocalAsset(file, fields);
  const sourceUrl = await uploadToTemp(file, file.type);
  return fetch("/api/assets", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...(sourceUrl ? { sourceUrl } : { image: await blobToDataUrl(file) }),
      ...fields,
    }),
  });
}

// URL d'origine d'un fichier glissé (ou collé) depuis une page web, ex:
// SharePoint. Rangée à côté du File lui-même plutôt que passée de prop en
// prop : le même objet File traverse tous les chemins jusqu'à l'upload
// (vignette de section, médiathèque, popin de recadrage).
const dropOrigins = new WeakMap<File, string>();

export function rememberDropOrigin(file: File, dt: DataTransfer | null): void {
  const url = dt ? extractDragOriginUrl(dt) : null;
  if (url) dropOrigins.set(file, url);
}

export function dropOriginOf(file: File | null | undefined): string | null {
  return (file && dropOrigins.get(file)) ?? null;
}

/** Null pour un fichier venu du disque local : aucune URL à retenir. */
function extractDragOriginUrl(dt: DataTransfer): string | null {
  try {
    const uriList = dt.getData("text/uri-list");
    if (uriList) {
      const url = uriList.split(/\r?\n/).find((l) => l && !l.startsWith("#") && l.startsWith("http"));
      if (url) return url;
    }
    const html = dt.getData("text/html");
    if (html) {
      const m = /(?:src|href)="(https?:[^"]+)"/i.exec(html);
      if (m) return m[1];
    }
  } catch {
    // Drag depuis le système de fichiers : getData peut lever une SecurityError
    // sur certains navigateurs/environnements.
  }
  return null;
}
