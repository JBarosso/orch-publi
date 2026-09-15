import sharp from "sharp";
import { FILL_PROMPT, planGeneration, type GenerationFrame } from "@/lib/ai-fill";

// Complétion des zones vides via le point d'accès d'édition d'OpenAI.
//
// Approche calquée sur ce qui fonctionne dans le chat ChatGPT : on envoie
// l'image telle quelle, blanc compris, on demande simplement de compléter le
// blanc, et on garde le rendu du modèle tel qu'il revient.
//
// Les deux erreurs qui ont fait échouer les essais précédents, et qu'il ne
// faut pas réintroduire :
//   - envoyer un masque, qui fait basculer le modèle dans un autre mode ;
//   - recoller la photo d'origine par-dessus son rendu. Le modèle redessine
//     toute la scène : la photo intacte posée sur un décor redessiné crée
//     exactement le décalage visible qu'on cherchait à éviter. Son rendu est
//     cohérent avec lui-même, il faut le prendre entier.
//
// Contrepartie assumée : le sujet lui-même est redessiné. D'où l'aperçu
// avant/après dans la fenêtre d'upload, pour vérifier avant d'envoyer.
const OPENAI_EDITS_URL = "https://api.openai.com/v1/images/edits";

class AiFillError extends Error {}

export function dataUrlToBuffer(dataUrl: string): Buffer {
  const comma = dataUrl.indexOf(",");
  return Buffer.from(comma === -1 ? dataUrl : dataUrl.slice(comma + 1), "base64");
}

async function callOpenAi(apiKey: string, image: Buffer, size: string): Promise<Buffer> {
  // "input_fidelity: high" pousse le modèle à coller aux pixels reçus. Le
  // paramètre est récent et peut ne pas être servi partout : on retente sans
  // plutôt que de faire échouer toute la génération.
  const buildForm = (highFidelity: boolean) => {
    const form = new FormData();
    form.append("model", "gpt-image-1");
    form.append("prompt", FILL_PROMPT);
    form.append("size", size);
    form.append("quality", "high");
    form.append("n", "1");
    if (highFidelity) form.append("input_fidelity", "high");
    form.append("image", new Blob([new Uint8Array(image)], { type: "image/png" }), "image.png");
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
    // Signalé : sans ce paramètre le modèle s'éloigne davantage de l'image
    // reçue, ce qui se voit sur le rendu. Autant savoir que c'est le cas.
    console.warn("input_fidelity refusé par l'API, nouvel essai sans ce paramètre.");
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

/**
 * Met l'image au ratio exact attendu par le modèle.
 *
 * Les marges sont obtenues en étirant les pixels du bord, surtout pas en
 * blanc : du blanc supplémentaire se lit comme une zone à inventer et pousse le
 * modèle à reculer le cadrage, ce qui dézoome tout le sujet. Elles sont de
 * toute façon découpées au retour (cf. cropToTarget).
 */
export async function padToFrame(
  image: Buffer,
  frame: GenerationFrame,
  width: number,
  height: number,
): Promise<Buffer> {
  return sharp(image)
    .extend({
      left: frame.offsetX,
      top: frame.offsetY,
      right: frame.width - width - frame.offsetX,
      bottom: frame.height - height - frame.offsetY,
      extendWith: "copy",
    })
    .png()
    .toBuffer();
}

/**
 * Ramène le rendu à la taille cible.
 *
 * Le modèle ne sait produire que quelques formats fixes. On lui a donc envoyé
 * une toile déjà au bon ratio (marges blanches comprises, cf. planGeneration) :
 * le retour est un simple agrandissement uniforme, puis on découpe la zone
 * correspondant à l'image demandée. Sans cette mise au format, c'est le modèle
 * qui comblerait l'écart de ratio en étirant, et le sujet serait déformé.
 */
export async function cropToTarget(
  generated: Buffer,
  frame: GenerationFrame,
  width: number,
  height: number,
): Promise<Buffer> {
  return sharp(generated)
    .resize(frame.width, frame.height, { fit: "fill" })
    .extract({ left: frame.offsetX, top: frame.offsetY, width, height })
    .jpeg({ quality: 95 })
    .toBuffer();
}

export async function fillBlanks(apiKey: string, imageDataUrl: string): Promise<string> {
  const original = dataUrlToBuffer(imageDataUrl);
  const { width, height } = await sharp(original).metadata();
  if (!width || !height) throw new AiFillError("Image illisible.");

  const frame = planGeneration(width, height);
  const padded = await padToFrame(original, frame, width, height);

  const generated = await callOpenAi(apiKey, padded, frame.size);
  const result = await cropToTarget(generated, frame, width, height);

  return `data:image/jpeg;base64,${result.toString("base64")}`;
}

export function aiFillErrorMessage(err: unknown): string {
  return err instanceof AiFillError ? err.message : "Échec de la génération IA.";
}
