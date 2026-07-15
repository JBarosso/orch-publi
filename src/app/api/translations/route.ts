import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { translations } from "@/lib/schema";
import { asc, eq } from "drizzle-orm";
import { sanitizeTranslationRows } from "@/lib/translation-csv";
import { upsertTranslationRows } from "@/lib/translations";

export async function GET() {
  const result = await db
    .select()
    .from(translations)
    .orderBy(asc(translations.key));
  return NextResponse.json(result);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { entries } = body;

  if (!Array.isArray(entries)) {
    return NextResponse.json(
      { error: "entries doit être un tableau" },
      { status: 400 },
    );
  }

  const rows = sanitizeTranslationRows(entries);
  const invalidCount = entries.length - rows.length;

  const count = await upsertTranslationRows(rows, "replace");
  return NextResponse.json({ saved: count, ignored: invalidCount });
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "id requis" }, { status: 400 });
  }

  const [entry] = await db
    .select()
    .from(translations)
    .where(eq(translations.id, id));
  if (!entry) {
    return NextResponse.json({ error: "Entrée introuvable" }, { status: 404 });
  }

  await db.delete(translations).where(eq(translations.id, id));
  return NextResponse.json({ ok: true });
}
