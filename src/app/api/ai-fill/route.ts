import { NextRequest, NextResponse } from "next/server";
import { aiFillErrorMessage, fillBlanks } from "@/lib/ai-fill-server";
import { getOpenAiApiKey } from "@/lib/openai-key";

// La génération prend couramment 15 à 40 s : sans ce relèvement, la fonction
// est coupée par le délai par défaut de Vercel avant la réponse d'OpenAI.
export const maxDuration = 120;

export async function POST(request: NextRequest) {
  const apiKey = await getOpenAiApiKey();
  if (!apiKey) {
    return NextResponse.json(
      { error: "Aucune clé API OpenAI enregistrée — ajoutez-la dans Paramétrage." },
      { status: 400 },
    );
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body.image !== "string") {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }

  try {
    const image = await fillBlanks(apiKey, body.image);
    return NextResponse.json({ image });
  } catch (err) {
    console.error("Génération IA échouée :", err);
    return NextResponse.json({ error: aiFillErrorMessage(err) }, { status: 502 });
  }
}
