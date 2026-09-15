import sharp from "sharp";
import { FILL_PROMPT, pickGenerationSize, type BlankBands } from "@/lib/ai-fill";

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
  const form = new FormData();
  form.append("model", "gpt-image-1");
  form.append("prompt", FILL_PROMPT);
  form.append("size", size);
  form.append("n", "1");
  form.append("image", new Blob([new Uint8Array(image)], { type: "image/jpeg" }), "image.jpg");
  form.append("mask", new Blob([new Uint8Array(mask)], { type: "image/png" }), "mask.png");

  const res = await fetch(OPENAI_EDITS_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
  });

  if (!res.ok) {
    const detail = await res.json().catch(() => null);
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

/**
 * Remplit les bandes vides et recolle par-dessus la zone d'origine, intacte.
 *
 * Ce recollage est le point clé : le modèle ne sait produire que quelques
 * formats fixes (cf. pickGenerationSize) et réencode toute l'image, donc son
 * rendu est ramené aux dimensions cibles puis recouvert par les pixels
 * d'origine. Seules les bandes générées viennent de l'IA — le produit n'est
 * jamais réinterprété, et la légère déformation due au changement de format
 * ne touche que le décor reconstitué.
 */
export async function compositeFill(
  original: Buffer,
  generated: Buffer,
  bands: BlankBands,
  width: number,
  height: number,
): Promise<Buffer> {
  const innerWidth = width - bands.left - bands.right;
  const innerHeight = height - bands.top - bands.bottom;
  if (innerWidth <= 0 || innerHeight <= 0) throw new AiFillError("Zones vides incohérentes avec l'image.");

  const background = await sharp(generated).resize(width, height, { fit: "fill" }).toBuffer();
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

  const generated = await callOpenAi(apiKey, original, mask, pickGenerationSize(width, height));
  const merged = await compositeFill(original, generated, bands, width, height);

  return `data:image/jpeg;base64,${merged.toString("base64")}`;
}

export function aiFillErrorMessage(err: unknown): string {
  return err instanceof AiFillError ? err.message : "Échec de la génération IA.";
}
