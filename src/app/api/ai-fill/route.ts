import { NextRequest, NextResponse } from "next/server";
import { aiFillErrorMessage, fillBlanks } from "@/lib/ai-fill-server";
import { getOpenAiApiKey } from "@/lib/openai-key";
import type { BlankBands } from "@/lib/ai-fill";

// La génération prend couramment 15 à 40 s : sans ce relèvement, la fonction
// est coupée par le délai par défaut de Vercel avant la réponse d'OpenAI.
export const maxDuration = 120;

function isBands(value: unknown): value is BlankBands {
  if (!value || typeof value !== "object") return false;
  const b = value as Record<string, unknown>;
  return (["left", "top", "right", "bottom"] as const).every(
    (k) => typeof b[k] === "number" && Number.isInteger(b[k]) && (b[k] as number) >= 0,
  );
}

export async function POST(request: NextRequest) {
  const apiKey = await getOpenAiApiKey();
  if (!apiKey) {
    return NextResponse.json(
      { error: "Aucune clé API OpenAI enregistrée — ajoutez-la dans Paramétrage." },
      { status: 400 },
    );
  }

  const body = await request.json().catch(() => null);
  if (
    !body ||
    typeof body.image !== "string" ||
    typeof body.mask !== "string" ||
    !isBands(body.bands)
  ) {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }

  try {
    const image = await fillBlanks(apiKey, body.image, body.mask, body.bands);
    return NextResponse.json({ image });
  } catch (err) {
    console.error("Génération IA échouée :", err);
    return NextResponse.json({ error: aiFillErrorMessage(err) }, { status: 502 });
  }
}
