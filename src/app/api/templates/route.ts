import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { briefSections, customTemplates } from "@/lib/schema";
import { desc, eq } from "drizzle-orm";
import type { CustomTemplateStatus } from "@/types";
import {
  cloneBlocksWithNewIds,
  normalizeCustomContent,
} from "@/templates/custom/schema";

const STATUSES: CustomTemplateStatus[] = ["draft", "published", "archived"];

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const id = searchParams.get("id");
  const status = searchParams.get("status");

  if (id) {
    const [template] = await db
      .select()
      .from(customTemplates)
      .where(eq(customTemplates.id, id));
    if (!template) {
      return NextResponse.json({ error: "Template introuvable" }, { status: 404 });
    }
    return NextResponse.json(template);
  }

  const rows = status
    ? await db
        .select()
        .from(customTemplates)
        .where(eq(customTemplates.status, status))
        .orderBy(desc(customTemplates.updatedAt))
    : await db
        .select()
        .from(customTemplates)
        .orderBy(desc(customTemplates.updatedAt));

  return NextResponse.json(rows);
}

export async function POST(request: NextRequest) {
  const body = await request.json();

  // Conversion section -> template : snapshot figé et indépendant
  if (body.fromSectionId) {
    const [section] = await db
      .select()
      .from(briefSections)
      .where(eq(briefSections.id, body.fromSectionId));

    if (!section) {
      return NextResponse.json({ error: "Section introuvable" }, { status: 404 });
    }
    if (section.type !== "custom") {
      return NextResponse.json(
        { error: "Seules les sections personnalisées peuvent être converties en template" },
        { status: 400 },
      );
    }

    const content = normalizeCustomContent(section.content);
    const name =
      (typeof body.name === "string" && body.name.trim()) ||
      section.title ||
      "Template sans nom";

    const [created] = await db
      .insert(customTemplates)
      .values({
        name,
        status: "draft",
        layout: content.layout,
        // Le commentaire dev de la section n'est pas embarqué dans le template
        blocks: cloneBlocksWithNewIds(content.blocks),
      })
      .returning();

    return NextResponse.json(created, { status: 201 });
  }

  // Création classique
  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name) {
    return NextResponse.json({ error: "name est requis" }, { status: 400 });
  }

  const [created] = await db
    .insert(customTemplates)
    .values({
      name,
      status: "draft",
      layout: body.layout ?? "stack",
      blocks: Array.isArray(body.blocks) ? body.blocks : [],
    })
    .returning();

  return NextResponse.json(created, { status: 201 });
}

export async function PUT(request: NextRequest) {
  const body = await request.json();
  const { id, name, layout, blocks, status } = body;

  if (!id) {
    return NextResponse.json({ error: "id est requis" }, { status: 400 });
  }
  if (status !== undefined && !STATUSES.includes(status)) {
    return NextResponse.json({ error: "Statut invalide" }, { status: 400 });
  }
  if (name !== undefined && !String(name).trim()) {
    return NextResponse.json({ error: "Le nom ne peut pas être vide" }, { status: 400 });
  }

  const updateData: Record<string, unknown> = {};
  if (name !== undefined) updateData.name = String(name).trim();
  if (layout !== undefined) updateData.layout = layout;
  if (blocks !== undefined) updateData.blocks = blocks;
  if (status !== undefined) updateData.status = status;

  const [updated] = await db
    .update(customTemplates)
    .set(updateData)
    .where(eq(customTemplates.id, id))
    .returning();

  if (!updated) {
    return NextResponse.json({ error: "Template introuvable" }, { status: 404 });
  }

  return NextResponse.json(updated);
}

export async function DELETE(request: NextRequest) {
  const body = await request.json();
  const { id } = body;
  if (!id) {
    return NextResponse.json({ error: "id est requis" }, { status: 400 });
  }

  // Les sections créées depuis ce template sont des snapshots indépendants :
  // la suppression du template ne les affecte pas
  const [deleted] = await db
    .delete(customTemplates)
    .where(eq(customTemplates.id, id))
    .returning();

  if (!deleted) {
    return NextResponse.json({ error: "Template introuvable" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
