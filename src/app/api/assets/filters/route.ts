import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { assets } from "@/lib/schema";
import { asc, desc, isNotNull } from "drizzle-orm";

export async function GET() {
  const yearsRows = await db
    .select({ year: assets.year })
    .from(assets)
    .where(isNotNull(assets.year))
    .groupBy(assets.year)
    .orderBy(desc(assets.year));

  const weeksRows = await db
    .select({ week: assets.week })
    .from(assets)
    .where(isNotNull(assets.week))
    .groupBy(assets.week)
    .orderBy(asc(assets.week));

  const typesRows = await db
    .select({ type: assets.type })
    .from(assets)
    .groupBy(assets.type)
    .orderBy(asc(assets.type));

  return NextResponse.json({
    years: yearsRows.map((r) => r.year).filter((y): y is number => y != null),
    weeks: weeksRows.map((r) => r.week).filter((w): w is number => w != null),
    types: typesRows.map((r) => r.type).filter((t) => t.length > 0),
  });
}
