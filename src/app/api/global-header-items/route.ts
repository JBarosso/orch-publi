import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { globalHeaderItems } from "@/lib/schema";
import { and, asc, eq, ilike } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const search = searchParams.get("search");
  const locale = searchParams.get("locale");

  if (!locale) {
    return NextResponse.json({ error: "locale est requis" }, { status: 400 });
  }

  const conditions = [eq(globalHeaderItems.locale, locale)];
  if (search) conditions.push(ilike(globalHeaderItems.label, `%${search}%`));

  const rows = await db
    .select()
    .from(globalHeaderItems)
    .where(and(...conditions))
    .orderBy(asc(globalHeaderItems.label))
    .limit(50);

  return NextResponse.json(rows);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { locale, label, text, linkType, cgid, cid, link } = body;

  if (!locale) {
    return NextResponse.json({ error: "locale est requis" }, { status: 400 });
  }
  const cleanLabel = typeof label === "string" ? label.trim() : "";
  if (!cleanLabel) {
    return NextResponse.json({ error: "label est requis" }, { status: 400 });
  }

  const [created] = await db
    .insert(globalHeaderItems)
    .values({
      locale,
      label: cleanLabel,
      text: typeof text === "string" ? text : "",
      linkType: typeof linkType === "string" ? linkType : "none",
      cgid: typeof cgid === "string" ? cgid : "",
      cid: typeof cid === "string" ? cid : "",
      link: typeof link === "string" ? link : "",
    })
    .returning();

  return NextResponse.json(created, { status: 201 });
}

export async function PUT(request: NextRequest) {
  const body = await request.json();
  const { id, label, text, linkType, cgid, cid, link } = body;

  if (!id) {
    return NextResponse.json({ error: "id est requis" }, { status: 400 });
  }
  const cleanLabel = typeof label === "string" ? label.trim() : "";
  if (!cleanLabel) {
    return NextResponse.json({ error: "label est requis" }, { status: 400 });
  }

  // La locale n'est jamais modifiée après création (un item appartient à une
  // seule langue) — seul le contenu peut être mis à jour.
  const [updated] = await db
    .update(globalHeaderItems)
    .set({
      label: cleanLabel,
      text: typeof text === "string" ? text : "",
      linkType: typeof linkType === "string" ? linkType : "none",
      cgid: typeof cgid === "string" ? cgid : "",
      cid: typeof cid === "string" ? cid : "",
      link: typeof link === "string" ? link : "",
    })
    .where(eq(globalHeaderItems.id, id))
    .returning();

  if (!updated) {
    return NextResponse.json({ error: "Item introuvable" }, { status: 404 });
  }

  return NextResponse.json(updated);
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id est requis" }, { status: 400 });
  }

  // Les sections l'ayant chargé sont des snapshots indépendants (sourceItemId
  // reste renseigné mais ne pointe plus vers rien) : la suppression ne les affecte pas.
  const [deleted] = await db
    .delete(globalHeaderItems)
    .where(eq(globalHeaderItems.id, id))
    .returning();

  if (!deleted) {
    return NextResponse.json({ error: "Item introuvable" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
