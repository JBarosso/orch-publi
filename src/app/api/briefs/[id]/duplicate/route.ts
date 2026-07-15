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
import type { Locale } from "@/types";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { targetLocale, targetWeek, translate } = await request.json();

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

  const [newBrief] = await db
    .insert(briefs)
    .values({
      slug,
      year,
      week,
      locale: targetLocale,
      index: nextIndex,
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

  if (originalSections.length > 0) {
    await db.insert(briefSections).values(
      originalSections.map((s) => ({
        briefId: newBrief.id,
        type: s.type,
        title: s.title,
        order: s.order,
        content: transformContent(s.type, s.content),
        visible: s.visible,
      })),
    );
  }

  return NextResponse.json(
    { ...newBrief, translation: stats },
    { status: 201 },
  );
}
