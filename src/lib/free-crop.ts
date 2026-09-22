// Cadre de recadrage libre (logo marque) : position et taille en fractions
// de l'image (0 à 1), indépendantes de la taille d'affichage.
export interface CropRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export type CropHandle = "move" | "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw";

export const FULL_RECT: CropRect = { x: 0, y: 0, w: 1, h: 1 };

// Plus petit cadre autorisé, pour qu'il reste attrapable.
const MIN_SIZE = 0.02;

const clamp = (v: number, min: number, max: number) => Math.min(Math.max(v, min), max);

/** Cadre après un glissement de (dx, dy), en fractions de l'image, depuis `start`. */
export function dragCropRect(start: CropRect, handle: CropHandle, dx: number, dy: number): CropRect {
  if (handle === "move") {
    return { ...start, x: clamp(start.x + dx, 0, 1 - start.w), y: clamp(start.y + dy, 0, 1 - start.h) };
  }
  let left = start.x;
  let top = start.y;
  let right = start.x + start.w;
  let bottom = start.y + start.h;
  if (handle.includes("w")) left = clamp(left + dx, 0, right - MIN_SIZE);
  if (handle.includes("e")) right = clamp(right + dx, left + MIN_SIZE, 1);
  if (handle.includes("n")) top = clamp(top + dy, 0, bottom - MIN_SIZE);
  if (handle.includes("s")) bottom = clamp(bottom + dy, top + MIN_SIZE, 1);
  return { x: left, y: top, w: right - left, h: bottom - top };
}

/** Cadre qui couvre toute l'image : rien à recadrer, le fichier part tel quel. */
export function isFullRect(r: CropRect): boolean {
  return r.x < 0.001 && r.y < 0.001 && r.w > 0.999 && r.h > 0.999;
}
