import { writeFile, unlink, readFile } from "fs/promises";
import { join } from "path";
import { put, del } from "@vercel/blob";

// Sur Vercel, public/ est immuable au runtime (servi par le CDN depuis le
// build) : impossible d'y écrire des uploads utilisateur et de les voir
// remonter en prod (ça marche en local sur disque, jamais en prod — cause du
// bug "images qui ne remontent pas"). Vercel Blob prend le relai dès que le
// token est configuré ; sans token (dev local sans setup), on retombe sur le
// disque local comme avant.
const BLOB_ENABLED = !!process.env.BLOB_READ_WRITE_TOKEN;

export async function putAsset(
  buffer: Buffer,
  filename: string,
  contentType: string,
): Promise<string> {
  if (BLOB_ENABLED) {
    const blob = await put(filename, buffer, {
      access: "public",
      contentType,
      addRandomSuffix: true,
    });
    return blob.url;
  }
  const filepath = join(process.cwd(), "public", "uploads", filename);
  await writeFile(filepath, buffer);
  return `/uploads/${filename}`;
}

export async function deleteAsset(url: string): Promise<void> {
  try {
    if (url.startsWith("http")) {
      await del(url);
    } else {
      await unlink(join(process.cwd(), "public", url));
    }
  } catch {
    // fichier déjà absent : on ignore, l'appelant supprime la ligne en base
  }
}

export async function readAsset(url: string): Promise<Buffer> {
  if (url.startsWith("http")) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Impossible de lire l'asset distant : ${url}`);
    return Buffer.from(await res.arrayBuffer());
  }
  return readFile(join(process.cwd(), "public", url));
}
