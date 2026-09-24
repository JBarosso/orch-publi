import { strToU8, zipSync, type Zippable } from "fflate";
import type { ImageEntry } from "@/lib/section-images";
import { MISSING_IMAGES_FILE, missingImagesReport, zipFolderFor, type ZipPathContext } from "@/lib/export-paths";
import { processForExport } from "@/lib/image-pipeline";
import { LOCAL_IMAGE_MISSING_HEADER } from "@/lib/local-images";

export interface ClientZipResult {
  blob: Blob;
  /** Fichiers qui n'ont pas pu être produits (listés aussi dans l'archive). */
  failed: string[];
}

/**
 * ZIP d'export fabriqué dans le navigateur (mode local) : même arborescence,
 * mêmes fichiers et même rapport d'images manquantes que celui du serveur
 * (build-zip.ts), sans que le serveur ne touche aux images.
 *
 * Une image à la fois : la mémoire reste basse, même sur un poste modeste.
 * Les images locales sont servies par le service worker ; celles déjà sur le
 * serveur sont lues directement au stockage.
 */
export async function buildZipInBrowser(
  images: ImageEntry[],
  ctx: ZipPathContext,
  onProgress?: (done: number, total: number) => void,
): Promise<ClientZipResult> {
  const files: Zippable = {};
  const failed: string[] = [];

  for (const [index, img] of images.entries()) {
    const folder = zipFolderFor(img, ctx);
    try {
      const res = await fetch(img.imageUrl);
      // Image locale créée sur un autre poste : la route de remplacement
      // répond, mais ce n'est pas le visuel — on le signale comme manquant.
      if (!res.ok || res.headers.get(LOCAL_IMAGE_MISSING_HEADER)) throw new Error("image indisponible");
      for (const file of await processForExport(await res.blob(), img)) {
        // Déjà compressés (JPG, WebP, PNG) : stockés tels quels, rien à gagner.
        files[`${folder}/${img.baseName}.${file.ext}`] = [new Uint8Array(await file.blob.arrayBuffer()), { level: 0 }];
      }
    } catch (err) {
      console.error(`Image non exportée : ${folder}/${img.baseName}`, err);
      failed.push(`${folder}/${img.baseName}`);
    }
    onProgress?.(index + 1, images.length);
  }

  if (failed.length > 0) files[MISSING_IMAGES_FILE] = strToU8(missingImagesReport(failed));
  const zip = zipSync(files);
  return { blob: new Blob([zip.buffer as ArrayBuffer], { type: "application/zip" }), failed };
}

/** Propose le fichier au téléchargement, comme le fait l'export du serveur. */
export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}

/** Même nom d'archive que l'export du serveur. */
export function zipFileName(brief: { year: number; week: number; locale: string }): string {
  return `homepage-${brief.year}-wk${String(brief.week).padStart(2, "0")}-${brief.locale}.zip`;
}
