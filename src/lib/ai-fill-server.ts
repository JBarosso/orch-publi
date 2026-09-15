import sharp from "sharp";
import { FILL_PROMPT, planGeneration, type BlankBands, type GenerationFrame } from "@/lib/ai-fill";

const OPENAI_EDITS_URL = "https://api.openai.com/v1/images/edits";

export function dataUrlToBuffer(dataUrl: string): Buffer {
  const comma = dataUrl.indexOf(",");
  return Buffer.from(comma === -1 ? dataUrl : dataUrl.slice(comma + 1), "base64");
}

class AiFillError extends Error {}

async function callOpenAi(
  apiKey: string,
  image: Buffer,
  mask: Buffer,
  size: string,
): Promise<Buffer> {
  // Par défaut, le modèle recompose librement la scène à partir de l'image
  // fournie : son mur, sa marche, ses bords d'objets tombent alors ailleurs
  // que sur la photo, et le raccord saute aux yeux une fois l'original
  // recollé. "input_fidelity: high" lui impose de coller aux pixels reçus.
  // Le paramètre est récent et peut ne pas être servi partout : on retente
  // sans plutôt que de faire échouer toute la génération.
  const buildForm = (highFidelity: boolean) => {
    const form = new FormData();
    form.append("model", "gpt-image-1");
    form.append("prompt", FILL_PROMPT);
    form.append("size", size);
    form.append("quality", "high");
    form.append("n", "1");
    if (highFidelity) form.append("input_fidelity", "high");
    form.append("image", new Blob([new Uint8Array(image)], { type: "image/png" }), "image.png");
    form.append("mask", new Blob([new Uint8Array(mask)], { type: "image/png" }), "mask.png");
    return form;
  };

  const send = (highFidelity: boolean) =>
    fetch(OPENAI_EDITS_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: buildForm(highFidelity),
    });

  let res = await send(true);
  let detail = res.ok ? null : await res.json().catch(() => null);
  if (!res.ok && res.status === 400 && /input_fidelity/i.test(JSON.stringify(detail ?? ""))) {
    res = await send(false);
    detail = res.ok ? null : await res.json().catch(() => null);
  }

  if (!res.ok) {
    const message = detail?.error?.message;
    if (res.status === 401) throw new AiFillError("Clé API OpenAI refusée — vérifiez-la dans Paramétrage.");
    if (res.status === 429) throw new AiFillError("Quota OpenAI atteint ou trop d'appels simultanés — réessayez dans un instant.");
    throw new AiFillError(message ? `OpenAI : ${message}` : `OpenAI a répondu ${res.status}.`);
  }

  const payload = await res.json();
  const b64 = payload?.data?.[0]?.b64_json;
  if (typeof b64 !== "string") throw new AiFillError("Réponse OpenAI inattendue : aucune image renvoyée.");
  return Buffer.from(b64, "base64");
}

/** Complète l'image et son masque jusqu'au ratio attendu par le modèle. */
function padToFrame(
  input: Buffer,
  frame: GenerationFrame,
  width: number,
  height: number,
  background: sharp.Color,
) {
  return sharp(input).extend({
    left: frame.offsetX,
    top: frame.offsetY,
    right: frame.width - width - frame.offsetX,
    bottom: frame.height - height - frame.offsetY,
    background,
  });
}

/**
 * Prépare le couple image/masque envoyé au modèle.
 *
 * Les deux portent la même transparence : tout ce qui doit être peint (bandes
 * vides du recadrage + marges de mise au format) est à alpha zéro. L'image ne
 * part surtout pas avec des bandes blanches — un aplat blanc se lit comme un
 * vrai mur clair, que le modèle prolongerait au lieu de le remplacer.
 */
export async function buildGenerationInputs(
  original: Buffer,
  mask: Buffer,
  frame: GenerationFrame,
  width: number,
  height: number,
): Promise<{ image: Buffer; mask: Buffer }> {
  const paddedMask = await padToFrame(mask, frame, width, height, { r: 0, g: 0, b: 0, alpha: 0 })
    .png()
    .toBuffer();
  // "dest-in" reporte l'alpha du masque sur l'image.
  const image = await padToFrame(original, frame, width, height, "#ffffff")
    .ensureAlpha()
    .composite([{ input: paddedMask, blend: "dest-in" }])
    .png()
    .toBuffer();
  return { image, mask: paddedMask };
}

/**
 * Ramène le rendu du modèle à la taille cible : agrandissement uniforme de la
 * toile complète, puis découpe de la zone correspondant à l'image d'origine.
 * Les marges ajoutées par padToFrame sont jetées ici.
 */
export async function backgroundFromGeneration(
  generated: Buffer,
  frame: GenerationFrame,
  width: number,
  height: number,
): Promise<Buffer> {
  return sharp(generated)
    .resize(frame.width, frame.height, { fit: "fill" })
    .extract({ left: frame.offsetX, top: frame.offsetY, width, height })
    .toBuffer();
}

/** Recolle la zone d'origine, intacte, par-dessus le décor reconstitué. */
export async function compositeFill(
  original: Buffer,
  background: Buffer,
  bands: BlankBands,
  width: number,
  height: number,
): Promise<Buffer> {
  const innerWidth = width - bands.left - bands.right;
  const innerHeight = height - bands.top - bands.bottom;
  if (innerWidth <= 0 || innerHeight <= 0) throw new AiFillError("Zones vides incohérentes avec l'image.");

  const keep = await sharp(original)
    .extract({ left: bands.left, top: bands.top, width: innerWidth, height: innerHeight })
    .toBuffer();
  return sharp(background)
    .composite([{ input: keep, left: bands.left, top: bands.top }])
    .jpeg({ quality: 95 })
    .toBuffer();
}

export async function fillBlanks(
  apiKey: string,
  imageDataUrl: string,
  maskDataUrl: string,
  bands: BlankBands,
): Promise<string> {
  const original = dataUrlToBuffer(imageDataUrl);
  const mask = dataUrlToBuffer(maskDataUrl);
  const { width, height } = await sharp(original).metadata();
  if (!width || !height) throw new AiFillError("Image illisible.");

  const frame = planGeneration(width, height);
  const inputs = await buildGenerationInputs(original, mask, frame, width, height);
  const generated = await callOpenAi(apiKey, inputs.image, inputs.mask, frame.size);
  const background = await backgroundFromGeneration(generated, frame, width, height);
  const merged = await compositeFill(original, background, bands, width, height);

  return `data:image/jpeg;base64,${merged.toString("base64")}`;
}

export function aiFillErrorMessage(err: unknown): string {
  return err instanceof AiFillError ? err.message : "Échec de la génération IA.";
}
