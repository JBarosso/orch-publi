import { db } from "@/lib/db";
import { translations } from "@/lib/schema";
import { eq, inArray } from "drizzle-orm";
import type { Locale } from "@/types";
import type { TranslationRow } from "@/lib/translation-csv";
import {
  buildTranslationLookup,
  translateSectionContent,
  type GlossaryEntry,
  type TranslateStats,
} from "@/lib/translate-content";

/** Glossaire prêt à traduire d'une langue à l'autre (codes normalisés en majuscules). */
export async function loadTranslationLookup(source: string, target: string) {
  const glossary = await db.select().from(translations);
  return buildTranslationLookup(
    glossary.map((e) => ({ key: e.key, values: e.values as GlossaryEntry["values"] })),
    source.toUpperCase() as Locale,
    target.toUpperCase() as Locale,
  );
}

/** Traduit un contenu de section collé depuis une autre langue. */
export async function translatePastedContent(
  type: string,
  content: unknown,
  source: string,
  target: string,
): Promise<{ content: unknown; stats: TranslateStats }> {
  const lookup = await loadTranslationLookup(source, target);
  const stats: TranslateStats = { translated: 0, missing: 0, ambiguous: 0 };
  return { content: translateSectionContent(type, content, lookup, stats), stats };
}

// Upsert par clé.
// - "replace" : les valeurs envoyées remplacent intégralement celles de la clé (sauvegarde UI)
// - "merge"   : les valeurs envoyées écrasent langue par langue, les absentes sont conservées (import)
export async function upsertTranslationRows(
  rows: TranslationRow[],
  mode: "replace" | "merge",
): Promise<number> {
  if (rows.length === 0) return 0;

  // Déduplique par clé (la dernière occurrence gagne)
  const byKey = new Map(rows.map((row) => [row.key, row] as const));
  const keys = [...byKey.keys()];

  const existing = await db
    .select()
    .from(translations)
    .where(inArray(translations.key, keys));
  const existingByKey = new Map(existing.map((e) => [e.key, e]));

  let count = 0;
  for (const row of byKey.values()) {
    const found = existingByKey.get(row.key);
    if (found) {
      const values =
        mode === "merge"
          ? {
              ...(found.values as Partial<Record<Locale, string>>),
              ...row.values,
            }
          : row.values;
      await db
        .update(translations)
        .set({ values })
        .where(eq(translations.id, found.id));
    } else {
      await db.insert(translations).values({ key: row.key, values: row.values });
    }
    count++;
  }
  return count;
}
