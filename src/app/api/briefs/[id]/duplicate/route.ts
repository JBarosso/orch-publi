import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { briefs, briefSections } from "@/lib/schema";
import { eq, and, sql } from "drizzle-orm";
import { buildSlug } from "@/lib/utils";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { targetLocale, targetWeek } = await request.json();

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

  if (originalSections.length > 0) {
    await db.insert(briefSections).values(
      originalSections.map((s) => ({
        briefId: newBrief.id,
        type: s.type,
        title: s.title,
        order: s.order,
        content: s.content,
        visible: s.visible,
      })),
    );
  }

  return NextResponse.json(newBrief, { status: 201 });
}
