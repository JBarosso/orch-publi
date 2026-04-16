import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { assets } from "@/lib/schema";
import { asc, desc, isNotNull } from "drizzle-orm";

function hasMissingColumnError(err: unknown) {
  if (!err || typeof err !== "object") return false;
  const code = (err as { code?: string }).code;
  const causeCode = (err as { cause?: { code?: string } }).cause?.code;
  return code === "42703" || causeCode === "42703";
}

export async function GET() {
  try {
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

    return NextResponse.json({
      years: yearsRows.map((r) => r.year).filter((y): y is number => y != null),
      weeks: weeksRows.map((r) => r.week).filter((w): w is number => w != null),
    });
  } catch (err) {
    if (hasMissingColumnError(err)) {
      return NextResponse.json({ years: [], weeks: [] });
    }
    throw err;
  }
}

