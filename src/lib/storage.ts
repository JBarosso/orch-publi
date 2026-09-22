import { copy, del, list, put } from "@vercel/blob";

// Tous les fichiers vivent sur Vercel Blob, en local comme en prod : sur
// Vercel, public/ est en lecture seule au runtime.

export async function putAsset(
  buffer: Buffer,
  filename: string,
  contentType: string,
): Promise<string> {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    throw new Error(
      "BLOB_READ_WRITE_TOKEN absent : ajoute-le à .env.local (en local) ou dans Settings > Environment Variables (sur Vercel).",
    );
  }
  const blob = await put(filename, buffer, {
    access: "public",
    contentType,
    addRandomSuffix: true,
  });
  return blob.url;
}

export async function deleteAsset(url: string): Promise<void> {
  try {
    await del(url);
  } catch {
    // fichier déjà absent : on ignore, l'appelant supprime la ligne en base
  }
}

export async function readAsset(url: string): Promise<Buffer> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Impossible de lire l'asset : ${url}`);
  return Buffer.from(await res.arrayBuffer());
}

// --- Upload direct navigateur → Vercel Blob ---
// Sur Vercel, une fonction refuse tout corps de requête ou de réponse au-delà
// de 4,5 Mo (erreur 413), quel que soit proxyClientMaxBodySize. Le navigateur
// dépose donc les fichiers lui-même sous tmp/ (jeton délivré par
// /api/assets/blob-token) et seule leur URL transite par les routes, qui les
// traitent puis les suppriment.

export const TEMP_UPLOAD_PREFIX = "tmp/";

/**
 * N'accepte que les fichiers de tmp/ du store Blob : une URL arbitraire ferait
 * lire n'importe quoi au serveur, et un asset définitif transmis par erreur
 * serait supprimé après traitement.
 */
export function isTempUploadUrl(url: unknown): url is string {
  if (typeof url !== "string") return false;
  try {
    const { protocol, hostname, pathname } = new URL(url);
    return (
      protocol === "https:" &&
      hostname.endsWith(".public.blob.vercel-storage.com") &&
      pathname.startsWith(`/${TEMP_UPLOAD_PREFIX}`)
    );
  } catch {
    return false;
  }
}

/**
 * Fait d'un upload direct un asset définitif, sans traitement (vidéos). Copie
 * interne à Blob, hors de tmp/ que le ménage quotidien vide.
 */
export async function promoteTempUpload(
  url: string,
  filename: string,
  contentType: string,
): Promise<string> {
  const blob = await copy(url, filename, { access: "public", contentType, addRandomSuffix: true });
  await del(url);
  return blob.url;
}

/**
 * Ménage de tmp/ : aperçus de TIFF convertis, et uploads jamais traités
 * (dialogue fermé en cours de route). Au-delà de 24 h, plus rien ne les attend.
 */
export async function purgeStaleTempUploads(): Promise<number> {
  if (!process.env.BLOB_READ_WRITE_TOKEN) return 0;
  const cutoff = Date.now() - 24 * 60 * 60 * 1000;
  let deleted = 0;
  let cursor: string | undefined;
  do {
    const page = await list({ prefix: TEMP_UPLOAD_PREFIX, cursor });
    const stale = page.blobs
      .filter((blob) => blob.uploadedAt.getTime() < cutoff)
      .map((blob) => blob.url);
    if (stale.length > 0) {
      await del(stale);
      deleted += stale.length;
    }
    cursor = page.hasMore ? page.cursor : undefined;
  } while (cursor);
  return deleted;
}
