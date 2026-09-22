import { NextRequest, NextResponse } from "next/server";
import { asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { cmsPages } from "@/lib/schema";
import { CMS_ASSET_SECTION_TYPES } from "@/lib/cms-asset";

// Pages du site et asset Salesforce par type de section (onglet Assets CMS).

/** Ne garde que les types connus et des identifiants non vides. */
function cleanAssets(value: unknown): Record<string, string> {
  if (!value || typeof value !== "object") return {};
  const assets: Record<string, string> = {};
  for (const type of CMS_ASSET_SECTION_TYPES) {
    const id = (value as Record<string, unknown>)[type];
    if (typeof id === "string" && id.trim()) assets[type] = id.trim();
  }
  return assets;
}

export async function GET() {
  const rows = await db.select().from(cmsPages).orderBy(asc(cmsPages.name));
  return NextResponse.json(rows);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name) {
    return NextResponse.json({ error: "Nom de page requis" }, { status: 400 });
  }
  const [created] = await db
    .insert(cmsPages)
    .values({ name, assets: cleanAssets(body.assets), isDefault: body.isDefault === true })
    .returning();
  return NextResponse.json(created, { status: 201 });
}

export async function PUT(request: NextRequest) {
  const body = await request.json();
  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!body.id) {
    return NextResponse.json({ error: "id est requis" }, { status: 400 });
  }
  if (!name) {
    return NextResponse.json({ error: "Nom de page requis" }, { status: 400 });
  }
  const [updated] = await db
    .update(cmsPages)
    .set({ name, assets: cleanAssets(body.assets), isDefault: body.isDefault === true })
    .where(eq(cmsPages.id, body.id))
    .returning();
  if (!updated) {
    return NextResponse.json({ error: "Page introuvable" }, { status: 404 });
  }
  return NextResponse.json(updated);
}

export async function DELETE(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id est requis" }, { status: 400 });
  }
  // Les sections qui la visaient repassent à « aucune page » (clé étrangère
  // en SET NULL) : elles perdent l'asset déduit, pas leur saisie manuelle.
  const [deleted] = await db.delete(cmsPages).where(eq(cmsPages.id, id)).returning();
  if (!deleted) {
    return NextResponse.json({ error: "Page introuvable" }, { status: 404 });
  }
  return NextResponse.json({ success: true });
}
