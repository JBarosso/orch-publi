import { db } from "@/lib/db";
import { settings } from "@/lib/schema";
import { eq } from "drizzle-orm";

// Clé API OpenAI de la complétion IA des images, saisie depuis la page
// Paramétrage. Module à part du traitement d'image (ai-fill-server.ts) : lui
// n'a pas besoin de la base, et le garder indépendant le rend testable.

export const OPENAI_KEY_SETTING_KEY = "openaiApiKey";

export async function getOpenAiApiKey(): Promise<string> {
  const [row] = await db.select().from(settings).where(eq(settings.key, OPENAI_KEY_SETTING_KEY));
  return typeof row?.value === "string" ? row.value : "";
}

export async function setOpenAiApiKey(key: string): Promise<void> {
  await db
    .insert(settings)
    .values({ key: OPENAI_KEY_SETTING_KEY, value: key })
    .onConflictDoUpdate({ target: settings.key, set: { value: key, updatedAt: new Date() } });
}

/** Ne jamais renvoyer la clé au client : juste de quoi la reconnaître. */
export function maskApiKey(key: string): string {
  return key.length > 8 ? `…${key.slice(-4)}` : "";
}
