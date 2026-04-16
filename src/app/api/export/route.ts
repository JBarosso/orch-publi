import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { briefs, briefSections } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { generateMacaronsHTML } from "@/templates/macarons/export";
import type { MacaronsContent } from "@/types";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const sectionId = searchParams.get("sectionId");

  if (!sectionId) {
    return NextResponse.json(
      { error: "sectionId requis" },
      { status: 400 },
    );
  }

  const [section] = await db
    .select()
    .from(briefSections)
    .where(eq(briefSections.id, sectionId));

  if (!section) {
    return NextResponse.json(
      { error: "Section introuvable" },
      { status: 404 },
    );
  }

  const [brief] = await db
    .select()
    .from(briefs)
    .where(eq(briefs.id, section.briefId));

  if (!brief) {
    return NextResponse.json(
      { error: "Brief parent introuvable" },
      { status: 404 },
    );
  }

  let html = "";
  if (section.type === "macarons") {
    const content = section.content as MacaronsContent;
    html = generateMacaronsHTML(content?.items ?? [], {
      year: brief.year,
      week: brief.week,
      locale: brief.locale,
    });
  }

  return NextResponse.json({ html, type: section.type });
}
