import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { briefSections, customTemplates } from "@/lib/schema";
import { and, desc, eq, sql } from "drizzle-orm";
import {
  cloneBlocksWithNewIds,
  createEmptyCustomContent,
} from "@/templates/custom/schema";
import { createEmptyMeaV2Content } from "@/templates/mea-v2/schema";
import { createEmptyArianeContent } from "@/templates/ariane/schema";
import { createEmptyCarouselContent } from "@/templates/carousel/schema";
import { createEmptyGlobalHeaderContent } from "@/templates/global-header/schema";
import type { CustomBlock, CustomLayout } from "@/types";

function normalizeTypeLabel(type: string): string {
  if (type === "macarons") return "macaron";
  if (type === "custom") return "section perso";
  if (type === "macarons_v2") return "macaron v2";
  if (type === "mea_v2") return "MEA v2";
  if (type === "ariane") return "fil d'ariane";
  if (type === "edito") return "edito";
  if (type === "carousel") return "slider";
  if (type === "global_header") return "global header";
  return type;
}

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
  const { id, content, visible, order, title } = body;

  if (!id) {
    return NextResponse.json({ error: "id est requis" }, { status: 400 });
  }

  const updateData: Record<string, unknown> = {};
  if (content !== undefined) updateData.content = content;
  if (visible !== undefined) updateData.visible = visible;
  if (order !== undefined) updateData.order = order;
  if (title !== undefined) updateData.title = title;

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

  return NextResponse.json(updated);
}

export async function POST(request: NextRequest) {
  const body = await request.json();

  // Duplicate an existing section
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

    return NextResponse.json(created, { status: 201 });
  }

  // Create a new section
  const { briefId, type, title, templateId } = body;
  if (!briefId || !type) {
    return NextResponse.json({ error: "briefId et type sont requis" }, { status: 400 });
  }

  let content: unknown = { items: [] };
  let templateName: string | null = null;

  if (type === "custom") {
    if (templateId) {
      // Instanciation d'un template : snapshot figé (aucun lien conservé)
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
    } else {
      content = createEmptyCustomContent();
    }
  } else if (type === "mea_v2") {
    content = createEmptyMeaV2Content();
  } else if (type === "ariane") {
    content = createEmptyArianeContent();
  } else if (type === "carousel") {
    content = createEmptyCarouselContent();
  } else if (type === "global_header") {
    content = createEmptyGlobalHeaderContent();
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

  return NextResponse.json(created, { status: 201 });
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

  // Reindex section order for this brief
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
