import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { briefs, briefSections } from "@/lib/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { buildSlug } from "@/lib/utils";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const locale = searchParams.get("locale");
  const status = searchParams.get("status");

  const conditions = [];
  if (locale) conditions.push(eq(briefs.locale, locale));
  if (status)
    conditions.push(
      eq(briefs.status, status as "draft" | "published" | "treated"),
    );

  const result = await db
    .select()
    .from(briefs)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(briefs.createdAt));

  return NextResponse.json(result);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { year, week, locale } = body;

    if (!year || !week || !locale) {
      return NextResponse.json(
        { error: "year, week et locale sont requis" },
        { status: 400 },
      );
    }

    const existing = await db
      .select({ maxIndex: sql<number>`COALESCE(MAX("index"), 0)` })
      .from(briefs)
      .where(
        and(
          eq(briefs.year, year),
          eq(briefs.week, week),
          eq(briefs.locale, locale),
        ),
      );

    const nextIndex = (existing[0]?.maxIndex ?? 0) + 1;
    const slug = buildSlug(year, week, locale, nextIndex);

    const [newBrief] = await db
      .insert(briefs)
      .values({ slug, year, week, locale, index: nextIndex })
      .returning();

    await db.insert(briefSections).values({
      briefId: newBrief.id,
      type: "macarons",
      order: 0,
      content: { items: [] },
    });

    return NextResponse.json(newBrief, { status: 201 });
  } catch (err) {
    console.error("Brief creation error:", err);
    return NextResponse.json(
      { error: "Erreur lors de la création du brief" },
      { status: 500 },
    );
  }
}
