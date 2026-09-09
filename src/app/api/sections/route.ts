import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { briefSections, customTemplates } from "@/lib/schema";
import { and, desc, eq, sql } from "drizzle-orm";
import { cloneBlocksWithNewIds } from "@/templates/custom/schema";
import { createEmptySectionContent, normalizeSectionContent } from "@/templates/registry";
import { normalizeTypeLabel } from "@/lib/section-labels";
import type { CustomBlock, CustomLayout } from "@/types";

async function buildDefaultTitle(briefId: string, type: string): Promise<string> {
  const typeRows = await db
    .select({
      count: sql<number>`COUNT(*)::int`,
    })
    .from(briefSections)
    .where(and(eq(briefSections.briefId, briefId), eq(briefSections.type, type)));

  const index = (typeRows[0]?.count ?? 0) + 1;
  const label = normalizeTypeLabel(type);
  return `${label} (${index})`;
}

async function getNextOrder(briefId: string): Promise<number> {
  const rows = await db
    .select({
      maxOrder: sql<number>`COALESCE(MAX("order"), -1)`,
    })
    .from(briefSections)
    .where(eq(briefSections.briefId, briefId));

  return (rows[0]?.maxOrder ?? -1) + 1;
}

export async function PUT(request: NextRequest) {
  const body = await request.json();
  const { id, content, visible, order, title, updatedAt } = body;

  if (!id) {
    return NextResponse.json({ error: "id est requis" }, { status: 400 });
  }

  const updateData: Record<string, unknown> = {};
  if (content !== undefined) updateData.content = content;
  if (visible !== undefined) updateData.visible = visible;
  if (order !== undefined) updateData.order = order;
  if (title !== undefined) updateData.title = title;

  // Garde-fou de concurrence : le client renvoie l'updatedAt qu'il a chargé.
  // S'il ne correspond plus, quelqu'un a enregistré entre-temps et écraser
  // ferait disparaître son travail sans un mot. On compare en JS (et pas dans
  // un WHERE) parce que les deux valeurs passent alors par la même conversion
  // Drizzle vers Date : comparer directement à la colonne échouerait à tort,
  // les lignes créées par defaultNow() portant des microsecondes que le JSON
  // du client a perdues.
  const [current] = await db
    .select({ updatedAt: briefSections.updatedAt })
    .from(briefSections)
    .where(eq(briefSections.id, id));

  if (!current) {
    return NextResponse.json({ error: "Section introuvable" }, { status: 404 });
  }

  if (updatedAt && current.updatedAt.getTime() !== new Date(updatedAt).getTime()) {
    return NextResponse.json(
      {
        error:
          "Cette section a été modifiée ailleurs depuis son ouverture. Recharge la page pour repartir de la version à jour.",
        currentUpdatedAt: current.updatedAt,
      },
      { status: 409 },
    );
  }

  const [updated] = await db
    .update(briefSections)
    .set(updateData)
    .where(eq(briefSections.id, id))
    .returning();

  if (!updated) {
    return NextResponse.json(
      { error: "Section introuvable" },
      { status: 404 },
    );
  }

  return NextResponse.json({ ...updated, content: normalizeSectionContent(updated.type, updated.content) });
}

export async function POST(request: NextRequest) {
  const body = await request.json();

  // Duplication d'une section existante
  if (body.sourceSectionId) {
    const [source] = await db
      .select()
      .from(briefSections)
      .where(eq(briefSections.id, body.sourceSectionId));

    if (!source) {
      return NextResponse.json({ error: "Section source introuvable" }, { status: 404 });
    }

    const nextOrder = await getNextOrder(source.briefId);
    const [created] = await db
      .insert(briefSections)
      .values({
        briefId: source.briefId,
        type: source.type,
        title: source.title ? `${source.title} (copie)` : await buildDefaultTitle(source.briefId, source.type),
        order: nextOrder,
        content: source.content,
        visible: source.visible,
      })
      .returning();

    return NextResponse.json(
      { ...created, content: normalizeSectionContent(created.type, created.content) },
      { status: 201 },
    );
  }

  // Création d'une nouvelle section
  const { briefId, type, title, templateId } = body;
  if (!briefId || !type) {
    return NextResponse.json({ error: "briefId et type sont requis" }, { status: 400 });
  }

  let content: unknown = createEmptySectionContent(type);
  let templateName: string | null = null;

  // Seule exception au contenu par défaut du registre : instancier un template
  // personnalisé enregistré, copié en snapshot figé (aucun lien conservé).
  if (type === "custom" && templateId) {
    const [template] = await db
      .select()
      .from(customTemplates)
      .where(eq(customTemplates.id, templateId));
    if (!template) {
      return NextResponse.json({ error: "Template introuvable" }, { status: 404 });
    }
    content = {
      layout: template.layout as CustomLayout,
      comment: "",
      blocks: cloneBlocksWithNewIds(template.blocks as CustomBlock[]),
    };
    templateName = template.name;
  }

  const nextOrder = await getNextOrder(briefId);
  const [created] = await db
    .insert(briefSections)
    .values({
      briefId,
      type,
      title:
        (title?.trim?.() || "") ||
        templateName ||
        (await buildDefaultTitle(briefId, type)),
      order: nextOrder,
      content,
      visible: true,
    })
    .returning();

  return NextResponse.json(
    { ...created, content: normalizeSectionContent(created.type, created.content) },
    { status: 201 },
  );
}

export async function DELETE(request: NextRequest) {
  const body = await request.json();
  const { id } = body;
  if (!id) {
    return NextResponse.json({ error: "id est requis" }, { status: 400 });
  }

  const [deleted] = await db
    .delete(briefSections)
    .where(eq(briefSections.id, id))
    .returning();

  if (!deleted) {
    return NextResponse.json({ error: "Section introuvable" }, { status: 404 });
  }

  // Réindexe l'ordre des sections du brief
  const sections = await db
    .select({ id: briefSections.id })
    .from(briefSections)
    .where(eq(briefSections.briefId, deleted.briefId))
    .orderBy(briefSections.order, desc(briefSections.createdAt));

  await Promise.all(
    sections.map((section, index) =>
      db
        .update(briefSections)
        .set({ order: index })
        .where(eq(briefSections.id, section.id)),
    ),
  );

  return NextResponse.json({ success: true });
}
