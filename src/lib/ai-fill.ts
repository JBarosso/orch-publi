// Complétion IA des zones vides laissées par un recadrage dézoomé.
//
// Rien à "détecter" par analyse de pixels : le recadrage client
// (getCroppedImg, image-upload-dialog.tsx) peint un fond blanc puis dessine
// l'image par-dessus. Quand l'utilisateur dézoome sous la taille du cadre, la
// zone de recadrage déborde de l'image et les bandes restées blanches se
// déduisent exactement de la géométrie — d'où ce calcul plutôt qu'une
// heuristique sur la couleur, qui confondrait un vrai fond blanc (packshot)
// avec une zone vide.

/** Zone de recadrage exprimée dans le repère de l'image source (react-easy-crop). */
export interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Largeur en pixels de sortie des bandes vides, par côté. */
export interface BlankBands {
  left: number;
  top: number;
  right: number;
  bottom: number;
  canvasWidth: number;
  canvasHeight: number;
}

export function computeBlankBands(
  pixelCrop: CropArea,
  sourceWidth: number,
  sourceHeight: number,
  targetWidth?: number,
  targetHeight?: number,
): BlankBands {
  // Troncature et non arrondi : canvas.width est un entier non signé, le
  // navigateur tronque la valeur flottante que lui passe getCroppedImg. Les
  // bandes doivent tomber sur exactement les mêmes pixels, sinon le recollage
  // côté serveur décale d'un pixel et laisse un liseré blanc.
  const canvasWidth = Math.floor(targetWidth || pixelCrop.width);
  const canvasHeight = Math.floor(targetHeight || pixelCrop.height);
  const scaleX = canvasWidth / pixelCrop.width;
  const scaleY = canvasHeight / pixelCrop.height;

  // Position de l'image dans le repère du canevas de sortie.
  const imageLeft = -pixelCrop.x * scaleX;
  const imageTop = -pixelCrop.y * scaleY;
  const imageRight = imageLeft + sourceWidth * scaleX;
  const imageBottom = imageTop + sourceHeight * scaleY;

  const clamp = (v: number, max: number) => Math.min(Math.max(0, Math.round(v)), max);
  return {
    left: clamp(imageLeft, canvasWidth),
    top: clamp(imageTop, canvasHeight),
    right: clamp(canvasWidth - imageRight, canvasWidth),
    bottom: clamp(canvasHeight - imageBottom, canvasHeight),
    canvasWidth,
    canvasHeight,
  };
}

/**
 * Vrai s'il y a des bandes vides ET assez d'image d'origine pour que l'IA ait
 * de quoi prolonger. Une image quasi entièrement hors cadre ne donnerait rien
 * d'exploitable : mieux vaut ne pas proposer la génération du tout.
 */
export function hasFillableBlanks(bands: BlankBands): boolean {
  const innerWidth = bands.canvasWidth - bands.left - bands.right;
  const innerHeight = bands.canvasHeight - bands.top - bands.bottom;
  if (innerWidth < bands.canvasWidth * 0.2 || innerHeight < bands.canvasHeight * 0.2) return false;
  return bands.left > 0 || bands.right > 0 || bands.top > 0 || bands.bottom > 0;
}

export function describeBlankSides(bands: BlankBands): string {
  const sides = [
    bands.left > 0 && "à gauche",
    bands.right > 0 && "à droite",
    bands.top > 0 && "en haut",
    bands.bottom > 0 && "en bas",
  ].filter((s): s is string => typeof s === "string");
  if (sides.length === 0) return "";
  if (sides.length === 1) return sides[0];
  return `${sides.slice(0, -1).join(", ")} et ${sides[sides.length - 1]}`;
}

// gpt-image-1 ne sait produire que ces trois formats. On génère donc dans
// celui dont le ratio est le plus proche de la cible, puis on ramène le
// résultat aux dimensions voulues côté serveur : l'écart résiduel ne déforme
// que le fond reconstitué, jamais le produit (recollé tel quel par-dessus).
export const GENERATION_SIZES = [
  { width: 1024, height: 1024 },
  { width: 1536, height: 1024 },
  { width: 1024, height: 1536 },
] as const;

export function pickGenerationSize(width: number, height: number): string {
  const targetRatio = Math.log(width / height);
  const best = GENERATION_SIZES.reduce((acc, size) =>
    Math.abs(Math.log(size.width / size.height) - targetRatio) <
    Math.abs(Math.log(acc.width / acc.height) - targetRatio)
      ? size
      : acc,
  );
  return `${best.width}x${best.height}`;
}

export interface GenerationFrame {
  /** Format demandé au modèle, parmi les seuls qu'il sait produire. */
  size: string;
  /** Toile envoyée au modèle : l'image cible complétée au format ci-dessus. */
  width: number;
  height: number;
  /** Position de l'image cible dans cette toile. */
  offsetX: number;
  offsetY: number;
}

/**
 * Prépare une toile au ratio exact du format généré.
 *
 * Sans cela, le modèle reçoit une image d'un ratio et doit en rendre une d'un
 * autre : il l'étire ou la recadre à sa guise, et le décor reconstitué ne
 * s'aligne plus avec l'original — une ligne d'horizon, un rebord de marche ou
 * une plinthe se décale visiblement à la jonction. En complétant nous-mêmes
 * l'image jusqu'au bon ratio (les marges ajoutées sont à générer puis
 * découpées), le modèle n'a plus aucun écart à rattraper et le retour à la
 * taille cible redevient un simple agrandissement uniforme.
 */
export function planGeneration(width: number, height: number): GenerationFrame {
  const size = pickGenerationSize(width, height);
  const [genWidth, genHeight] = size.split("x").map(Number);
  const ratio = genWidth / genHeight;

  const paddedWidth = width / height > ratio ? width : Math.round(height * ratio);
  const paddedHeight = width / height > ratio ? Math.round(width / ratio) : height;

  return {
    size,
    width: paddedWidth,
    height: paddedHeight,
    offsetX: Math.floor((paddedWidth - width) / 2),
    offsetY: Math.floor((paddedHeight - height) / 2),
  };
}

// Consigne volontairement restrictive : on veut le prolongement le plus bête
// possible du décor existant (un mur continue en mur), surtout pas une
// "amélioration" créative qui inventerait des objets ou des personnes.
export const FILL_PROMPT =
  "Extend the existing photograph outward to fill the transparent regions, and nothing else. " +
  "Only continue what is already touching each transparent edge: a wall stays an empty wall, " +
  "a floor stays a floor, a plain backdrop stays plain. " +
  "Match the adjacent pixels exactly in color, lighting, texture, grain, blur and perspective. " +
  "Absolutely do not invent or add anything: no people, no objects, no products, no furniture, " +
  "no patterns, no shadows, no text, no logos. Do not duplicate, move or alter anything already " +
  "present in the photo. The result must look like the exact same photograph, simply framed wider.";
