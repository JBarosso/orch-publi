import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { translations } from "@/lib/schema";
import { asc } from "drizzle-orm";
import type { Locale } from "@/types";
import {
  translationsToCSV,
  translationsToJSON,
  type TranslationRow,
} from "@/lib/translation-csv";

export async function GET(request: NextRequest) {
  const format = request.nextUrl.searchParams.get("format") === "csv" ? "csv" : "json";

  const result = await db
    .select()
    .from(translations)
    .orderBy(asc(translations.key));

  const rows: TranslationRow[] = result.map((entry) => ({
    key: entry.key,
    values: entry.values as Partial<Record<Locale, string>>,
  }));

  const isCsv = format === "csv";
  const body = isCsv ? translationsToCSV(rows) : translationsToJSON(rows);

  return new NextResponse(body, {
    headers: {
      "Content-Type": isCsv
        ? "text/csv; charset=utf-8"
        : "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="traductions.${format}"`,
    },
  });
}
