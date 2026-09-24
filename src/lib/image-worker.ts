// Worker du traitement d'image (mode local) : lecture, redimensionnement
// Lanczos3 et encodage, hors de la page. Deux raisons :
//   - la page ne se fige jamais, même sur un gros export ;
//   - Chrome freine fortement les encodages d'un onglet en arrière-plan
//     (mesuré : 1 s par JPEG 1920×1080 sur la page, 30 ms ici). Un
//     intégrateur change forcément d'onglet pendant un export.
import pica from "pica";
import { capDimensions, fitBox, wholeBox, type Box } from "@/lib/image-geometry";

export type OutputType = "image/jpeg" | "image/png" | "image/webp";

export interface RenderJob {
  id: number;
  file: Blob;
  /** Taille de sortie imposée (recadrée), ou celle de la source, plafonnée. */
  size: { width: number; height: number; fit: "cover" | "contain" } | { max: number | null };
  /** Fond blanc qui aplatit la transparence ; null la conserve (PNG). */
  background: "#fff" | null;
  types: OutputType[];
}

export type RenderResult = { id: number; blobs: Blob[] } | { id: number; error: string };

const QUALITY = 0.85;
const resizer = pica({ features: ["js", "wasm"] });

function canvas(w: number, h: number, background: string | null): OffscreenCanvas {
  const c = new OffscreenCanvas(w, h);
  if (background) {
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, w, h);
  }
  return c;
}

async function render(job: RenderJob): Promise<Blob[]> {
  const source = await createImageBitmap(job.file);
  try {
    let w: number;
    let h: number;
    let box: Box;
    if ("width" in job.size) {
      ({ width: w, height: h } = job.size);
      box = fitBox(source.width, source.height, w, h, job.size.fit);
    } else {
      ({ w, h } = capDimensions(source.width, source.height, job.size.max ?? Infinity));
      box = wholeBox(source.width, source.height, w, h);
    }

    // Zone utile à pleine résolution. Aplatie sur blanc AVANT la réduction
    // quand il le faut : réduire des pixels transparents puis les aplatir
    // laisserait un liseré sombre sur les bords.
    const srcW = Math.max(1, Math.round(box.sw));
    const srcH = Math.max(1, Math.round(box.sh));
    const zone = canvas(srcW, srcH, job.background);
    const zoneCtx = zone.getContext("2d")!;
    zoneCtx.drawImage(source, box.sx, box.sy, box.sw, box.sh, 0, 0, srcW, srcH);

    let sized: OffscreenCanvas = zone;
    if (srcW !== box.dw || srcH !== box.dh) {
      // ponytail: transparence conservée (PNG) réduite sans prémultiplication,
      // léger liseré possible au bord d'un PNG transparent > 2400 px ; cas rare.
      const pixels = await resizer.resizeBuffer({
        src: new Uint8Array(zoneCtx.getImageData(0, 0, srcW, srcH).data.buffer),
        width: srcW,
        height: srcH,
        toWidth: box.dw,
        toHeight: box.dh,
        filter: "lanczos3",
        unsharpAmount: 0,
      });
      sized = new OffscreenCanvas(box.dw, box.dh);
      sized.getContext("2d")!.putImageData(new ImageData(new Uint8ClampedArray(pixels), box.dw, box.dh), 0, 0);
    }

    const out = canvas(w, h, job.background);
    out.getContext("2d")!.drawImage(sized, box.dx, box.dy);

    return Promise.all(
      job.types.map(async (type) => {
        const blob = await out.convertToBlob({ type, quality: type === "image/png" ? undefined : QUALITY });
        // Un navigateur qui ne sait pas produire ce format renvoie un PNG sans
        // prévenir : on refuse plutôt qu'exporter un .webp qui n'en est pas un.
        if (blob.type !== type) {
          throw new Error(`Ce navigateur ne sait pas produire d'image ${type.split("/")[1].toUpperCase()} : utilisez Chrome ou Edge.`);
        }
        return blob;
      }),
    );
  } finally {
    source.close();
  }
}

self.addEventListener("message", async (event: MessageEvent<RenderJob>) => {
  const job = event.data;
  let result: RenderResult;
  try {
    result = { id: job.id, blobs: await render(job) };
  } catch (err) {
    result = { id: job.id, error: err instanceof Error ? err.message : String(err) };
  }
  (self as unknown as Worker).postMessage(result);
});
