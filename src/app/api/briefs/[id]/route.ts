import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { briefs, briefSections } from "@/lib/schema";
import { eq } from "drizzle-orm";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const [brief] = await db.select().from(briefs).where(eq(briefs.id, id));

  if (!brief) {
    return NextResponse.json({ error: "Brief introuvable" }, { status: 404 });
  }

  const sections = await db
    .select()
    .from(briefSections)
    .where(eq(briefSections.briefId, id))
    .orderBy(briefSections.order);

  return NextResponse.json({ ...brief, sections });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await request.json();

  const updateData: Record<string, unknown> = {};
  if (body.status) updateData.status = body.status;

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: "Rien à mettre à jour" }, { status: 400 });
  }

  const [updated] = await db
    .update(briefs)
    .set(updateData)
    .where(eq(briefs.id, id))
    .returning();

  if (!updated) {
    return NextResponse.json({ error: "Brief introuvable" }, { status: 404 });
  }

  return NextResponse.json(updated);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const [deleted] = await db
    .delete(briefs)
    .where(eq(briefs.id, id))
    .returning();

  if (!deleted) {
    return NextResponse.json({ error: "Brief introuvable" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
