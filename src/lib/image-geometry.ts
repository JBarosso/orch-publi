// Calculs purs du traitement d'image (sans DOM) : partagés par la page et le
// worker qui fait le travail (image-worker.ts).

export interface Box {
  /** Zone lue dans la source. */
  sx: number;
  sy: number;
  sw: number;
  sh: number;
  /** Où et à quelle taille elle est posée dans l'image de sortie. */
  dx: number;
  dy: number;
  dw: number;
  dh: number;
}

/** Zone source et zone de destination, comme fit "cover" / "contain" de sharp. */
export function fitBox(srcW: number, srcH: number, dstW: number, dstH: number, fit: "cover" | "contain"): Box {
  if (fit === "cover") {
    const scale = Math.max(dstW / srcW, dstH / srcH);
    const sw = dstW / scale;
    const sh = dstH / scale;
    return { sx: (srcW - sw) / 2, sy: (srcH - sh) / 2, sw, sh, dx: 0, dy: 0, dw: dstW, dh: dstH };
  }
  const scale = Math.min(dstW / srcW, dstH / srcH);
  const dw = Math.round(srcW * scale);
  const dh = Math.round(srcH * scale);
  return { sx: 0, sy: 0, sw: srcW, sh: srcH, dx: Math.round((dstW - dw) / 2), dy: Math.round((dstH - dh) / 2), dw, dh };
}

/** Plafond du plus grand côté, sans jamais agrandir (fit "inside" + withoutEnlargement de sharp). */
export function capDimensions(w: number, h: number, max: number): { w: number; h: number } {
  const scale = Math.min(1, max / Math.max(w, h));
  return { w: Math.round(w * scale), h: Math.round(h * scale) };
}

/** Toute la source, posée à la taille donnée. */
export function wholeBox(srcW: number, srcH: number, w: number, h: number): Box {
  return { sx: 0, sy: 0, sw: srcW, sh: srcH, dx: 0, dy: 0, dw: w, dh: h };
}
