import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { assets, briefs, briefSections } from "@/lib/schema";
import { eq, or, isNull } from "drizzle-orm";
import type { MacaronsContent } from "@/types";

function hasMissingColumnError(err: unknown) {
  if (!err || typeof err !== "object") return false;
  const code = (err as { code?: string }).code;
  const causeCode = (err as { cause?: { code?: string } }).cause?.code;
  return code === "42703" || causeCode === "42703";
}

export async function POST() {
  try {
    const sections = await db
      .select({
        year: briefs.year,
        briefWeek: briefs.week,
        content: briefSections.content,
      })
      .from(briefSections)
      .innerJoin(briefs, eq(briefSections.briefId, briefs.id))
      .where(eq(briefSections.type, "macarons"));

    const urlMeta = new Map<string, { year: number; week: number }>();

    for (const section of sections) {
      const content = section.content as MacaronsContent | null;
      const items = content?.items ?? [];
      for (const item of items) {
        if (!item.imageUrl) continue;
        if (!urlMeta.has(item.imageUrl)) {
          urlMeta.set(item.imageUrl, {
            year: section.year,
            week: item.imageWeek ?? section.briefWeek,
          });
        }
      }
    }

    const rows = await db
      .select({
        id: assets.id,
        url: assets.url,
        type: assets.type,
        year: assets.year,
        week: assets.week,
      })
      .from(assets)
      .where(or(isNull(assets.year), isNull(assets.week), isNull(assets.type), eq(assets.type, "macarons")));

    let updated = 0;
    for (const row of rows) {
      const meta = urlMeta.get(row.url);
      if (!meta) continue;
      await db
        .update(assets)
        .set({ year: meta.year, week: meta.week, type: "macaron" })
        .where(eq(assets.id, row.id));
      updated += 1;
    }

    return NextResponse.json({
      ok: true,
      scanned: rows.length,
      updated,
    });
  } catch (err) {
    if (hasMissingColumnError(err)) {
      return NextResponse.json(
        {
          error: "Colonnes year/week absentes. Lancez la migration DB d'abord.",
        },
        { status: 409 },
      );
    }
    throw err;
  }
}

