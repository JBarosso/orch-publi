import { NextRequest, NextResponse } from "next/server";
import { and, asc, eq, ilike } from "drizzle-orm";
import { db } from "@/lib/db";
import { editoItems } from "@/lib/schema";

// Bibliothèque de blocs Edito — même contrat que /api/global-header-items.

function str(value: unknown): string {
  return typeof value === "string" ? value : "";
}

/** Contenu d'un bloc, sans la locale (fixée à la création, jamais modifiée). */
function contentFields(body: Record<string, unknown>) {
  return {
    theme: str(body.theme) || "aqua",
    title: str(body.title),
    text: str(body.text),
    imageUrl: str(body.imageUrl),
    linkType: str(body.linkType) || "cgid",
    cgid: str(body.cgid),
    cid: str(body.cid),
    link: str(body.link),
    buttons: Array.isArray(body.buttons) ? body.buttons : [],
  };
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const search = searchParams.get("search");
  const locale = searchParams.get("locale");
  if (!locale) {
    return NextResponse.json({ error: "locale est requis" }, { status: 400 });
  }

  const conditions = [eq(editoItems.locale, locale)];
  if (search) conditions.push(ilike(editoItems.label, `%${search}%`));

  const rows = await db
    .select()
    .from(editoItems)
    .where(and(...conditions))
    .orderBy(asc(editoItems.label))
    .limit(50);
  return NextResponse.json(rows);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const label = str(body.label).trim();
  if (!body.locale) {
    return NextResponse.json({ error: "locale est requis" }, { status: 400 });
  }
  if (!label) {
    return NextResponse.json({ error: "label est requis" }, { status: 400 });
  }

  const [created] = await db
    .insert(editoItems)
    .values({ locale: str(body.locale), label, ...contentFields(body) })
    .returning();
  return NextResponse.json(created, { status: 201 });
}

export async function PUT(request: NextRequest) {
  const body = await request.json();
  const label = str(body.label).trim();
  if (!body.id) {
    return NextResponse.json({ error: "id est requis" }, { status: 400 });
  }
  if (!label) {
    return NextResponse.json({ error: "label est requis" }, { status: 400 });
  }

  const [updated] = await db
    .update(editoItems)
    .set({ label, ...contentFields(body) })
    .where(eq(editoItems.id, str(body.id)))
    .returning();
  if (!updated) {
    return NextResponse.json({ error: "Bloc introuvable" }, { status: 404 });
  }
  return NextResponse.json(updated);
}

export async function DELETE(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id est requis" }, { status: 400 });
  }
  // Les sections qui l'ont chargé sont des copies indépendantes : les
  // supprimer de la bibliothèque ne les modifie pas.
  const [deleted] = await db.delete(editoItems).where(eq(editoItems.id, id)).returning();
  if (!deleted) {
    return NextResponse.json({ error: "Bloc introuvable" }, { status: 404 });
  }
  return NextResponse.json({ success: true });
}
