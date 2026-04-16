import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { briefSections } from "@/lib/schema";
import { eq } from "drizzle-orm";

export async function PUT(request: NextRequest) {
  const body = await request.json();
  const { id, content, visible, order } = body;

  if (!id) {
    return NextResponse.json({ error: "id est requis" }, { status: 400 });
  }

  const updateData: Record<string, unknown> = {};
  if (content !== undefined) updateData.content = content;
  if (visible !== undefined) updateData.visible = visible;
  if (order !== undefined) updateData.order = order;

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
