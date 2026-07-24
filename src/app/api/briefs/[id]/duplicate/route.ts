import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { briefs, briefSections, translations } from "@/lib/schema";
import { eq, and, sql } from "drizzle-orm";
import { buildSlug } from "@/lib/utils";
import {
  buildTranslationLookup,
  translateSectionContent,
  type GlossaryEntry,
  type TranslateStats,
} from "@/lib/translate-content";
import { freezeSectionContentWeek } from "@/lib/freeze-content-week";
import { detachGlobalHeaderLibraryLinks } from "@/templates/global-header/schema";
import type { GlobalHeaderContent, Locale } from "@/types";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { targetLocale, targetWeek, translate, name } = await request.json();

  if (!targetLocale) {
    return NextResponse.json(
      { error: "targetLocale est requis" },
      { status: 400 },
    );
  }

  const [original] = await db
    .select()
    .from(briefs)
    .where(eq(briefs.id, id));

  if (!original) {
    return NextResponse.json(
      { error: "Brief source introuvable" },
      { status: 404 },
    );
  }

  const week = targetWeek ?? original.week;
  const year = original.year;

  const existing = await db
    .select({ maxIndex: sql<number>`COALESCE(MAX("index"), 0)` })
    .from(briefs)
    .where(
      and(
        eq(briefs.year, year),
        eq(briefs.week, week),
        eq(briefs.locale, targetLocale),
      ),
    );

  const nextIndex = (existing[0]?.maxIndex ?? 0) + 1;
  const slug = buildSlug(year, week, targetLocale, nextIndex);
  // Par défaut, garde le nom du brief source (comme le reste des champs) —
  // personnalisable dans le dialogue de duplication.
  const cleanName = typeof name === "string" ? name.trim().slice(0, 128) : original.name;

  const [newBrief] = await db
    .insert(briefs)
    .values({
      slug,
      year,
      week,
      locale: targetLocale,
      index: nextIndex,
      name: cleanName,
    })
    .returning();

  const originalSections = await db
    .select()
    .from(briefSections)
    .where(eq(briefSections.briefId, id));

  // Traduction via le glossaire, uniquement si demandé et si la langue change.
  // Les locales sont normalisées en majuscules : les briefs historiques
  // stockent "fr" alors que le glossaire est indexé "FR".
  const sourceLocale = String(original.locale).toUpperCase() as Locale;
  const destLocale = String(targetLocale).toUpperCase() as Locale;
  const shouldTranslate = translate === true && destLocale !== sourceLocale;
  let stats: TranslateStats | null = null;
  let transformContent = (type: string, content: unknown) => content;

  if (shouldTranslate) {
    const glossary = await db.select().from(translations);
    const lookup = buildTranslationLookup(
      glossary.map((e) => ({
        key: e.key,
        values: e.values as GlossaryEntry["values"],
      })),
      sourceLocale,
      destLocale,
    );
    const s: TranslateStats = { translated: 0, missing: 0, ambiguous: 0 };
    stats = s;
    transformContent = (type, content) =>
      translateSectionContent(type, content, lookup, s);
  }

  // La semaine change réellement : les items natifs de la semaine source
  // doivent être figés (semaine + position) pour ne pas glisser vers la
  // nouvelle semaine du brief dupliqué alors que le fichier n'a jamais été
  // réuploadé. Pas de gel si on duplique sur la même semaine (ex: juste pour
  // une autre langue) — rien n'a besoin d'être figé dans ce cas.
  const shouldFreezeWeek = week !== original.week;
  // Indépendant de shouldTranslate (qui ne s'active que si "traduire" est
  // coché) : la langue change dès que targetLocale diffère, même sans
  // traduction demandée.
  const localeChanged = destLocale !== sourceLocale;

  if (originalSections.length > 0) {
    await db.insert(briefSections).values(
      originalSections.map((s) => {
        let content = shouldFreezeWeek
          ? freezeSectionContentWeek(s.type, s.content, original.week)
          : s.content;
        if (s.type === "global_header" && localeChanged) {
          content = detachGlobalHeaderLibraryLinks(content as GlobalHeaderContent);
        }
        return {
          briefId: newBrief.id,
          type: s.type,
          title: s.title,
          order: s.order,
          content: transformContent(s.type, content),
          visible: s.visible,
        };
      }),
    );
  }

  return NextResponse.json(
    { ...newBrief, translation: stats },
    { status: 201 },
  );
}
