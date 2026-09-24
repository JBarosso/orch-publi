import type { AssetSpec } from "@/lib/upload-specs";
import { MAX_SOURCE_DIMENSION, SVG_MIME_TYPE, sanitizeSvg } from "@/lib/upload-specs";
import type { ImageEntry } from "@/lib/section-images";
import type { OutputType, RenderJob, RenderResult } from "@/lib/image-worker";

// Traitement d'image du mode local : mêmes règles que le serveur, sans lui.
// Deux étapes, calquées chacune sur son équivalent serveur :
//   - processUpload    ↔ POST /api/assets    (image rangée dans la médiathèque)
//   - processForExport ↔ prepareImage, build-zip.ts (fichiers du ZIP)
// Ce fichier décide QUOI produire ; le travail lui-même (lecture,
// Lanczos3, encodage) se fait dans image-worker.ts, hors de la page.

type OutputFormat = "jpeg" | "png" | "webp";
const MIME: Record<OutputFormat, OutputType> = { jpeg: "image/jpeg", png: "image/png", webp: "image/webp" };
const EXT: Record<OutputFormat, string> = { jpeg: "jpg", png: "png", webp: "webp" };

/** Format de sortie d'un upload : "source" garde le format d'origine, l'AVIF devient PNG. */
export function uploadOutputFormat(spec: Pick<AssetSpec, "outputFormat">, sourceMime: string): OutputFormat {
  if (spec.outputFormat !== "source") return spec.outputFormat;
  if (sourceMime === "image/jpeg") return "jpeg";
  if (sourceMime === "image/webp") return "webp";
  return "png";
}

async function isSvgBlob(blob: Blob): Promise<boolean> {
  if (blob.type === SVG_MIME_TYPE) return true;
  return /<svg[\s>]/i.test(await blob.slice(0, 1024).text());
}

// --- Worker : un seul pour la page, créé à la première image ---
let worker: Worker | null = null;
let nextId = 0;
const pending = new Map<number, { resolve: (blobs: Blob[]) => void; reject: (err: Error) => void }>();

function getWorker(): Worker {
  if (worker) return worker;
  worker = new Worker(new URL("./image-worker.ts", import.meta.url), { type: "module" });
  worker.addEventListener("message", (event: MessageEvent<RenderResult>) => {
    const job = pending.get(event.data.id);
    if (!job) return;
    pending.delete(event.data.id);
    if ("error" in event.data) job.reject(new Error(event.data.error));
    else job.resolve(event.data.blobs);
  });
  worker.addEventListener("error", (event) => {
    // Worker tombé : on échoue proprement toutes les images en attente, et le
    // prochain appel en recrée un.
    for (const job of pending.values()) job.reject(new Error(event.message || "Traitement d'image interrompu"));
    pending.clear();
    worker?.terminate();
    worker = null;
  });
  return worker;
}

function render(job: Omit<RenderJob, "id">): Promise<Blob[]> {
  const id = nextId++;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    getWorker().postMessage({ ...job, id } satisfies RenderJob);
  });
}

export interface ProcessedFile {
  blob: Blob;
  ext: string;
  mimeType: string;
}

/** Équivalent navigateur de POST /api/assets : l'image telle que la médiathèque la garde. */
export async function processUpload(file: Blob, spec: AssetSpec): Promise<ProcessedFile> {
  if (spec.allowSvg && (await isSvgBlob(file))) {
    const svg = sanitizeSvg(await file.text());
    return { blob: new Blob([svg], { type: SVG_MIME_TYPE }), ext: "svg", mimeType: SVG_MIME_TYPE };
  }
  const format = uploadOutputFormat(spec, file.type);
  const [blob] = await render({
    file,
    // Dimensions imposées : "contain" sur fond blanc. Upload libre : plafonné,
    // transparence conservée sauf en JPEG — comme le serveur.
    size:
      spec.targetWidth && spec.targetHeight
        ? { width: spec.targetWidth, height: spec.targetHeight, fit: "contain" }
        : { max: MAX_SOURCE_DIMENSION },
    background: spec.targetWidth && spec.targetHeight ? "#fff" : format === "jpeg" ? "#fff" : null,
    types: [MIME[format]],
  });
  return { blob, ext: EXT[format], mimeType: MIME[format] };
}

export interface ExportFile {
  /** Extension du fichier dans le ZIP. */
  ext: string;
  blob: Blob;
}

/** Équivalent navigateur de prepareImage (build-zip.ts) : les fichiers d'une image dans le ZIP. */
export async function processForExport(file: Blob, img: ImageEntry): Promise<ExportFile[]> {
  if (img.vectorOrPng) {
    // Logo : SVG tel quel, sinon PNG sans redimensionnement ni fond blanc.
    if (await isSvgBlob(file)) return [{ ext: "svg", blob: file }];
    const [png] = await render({ file, size: { max: null }, background: null, types: ["image/png"] });
    return [{ ext: "png", blob: png }];
  }
  const types: OutputType[] = img.jpgOnly ? ["image/jpeg"] : ["image/jpeg", "image/webp"];
  const blobs = await render({
    file,
    size: img.width && img.height ? { width: img.width, height: img.height, fit: "cover" } : { max: null },
    background: "#fff",
    types,
  });
  return blobs.map((blob, i) => ({ ext: types[i] === "image/jpeg" ? "jpg" : "webp", blob }));
}
