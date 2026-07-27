import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { programmationBlocks } from "@/lib/schema";
import { eq } from "drizzle-orm";
import type { ProgrammationCountry } from "@/types";
import { PROGRAMMATION_COUNTRIES } from "@/types";

const COUNTRIES = PROGRAMMATION_COUNTRIES.map((c) => c.value);

function isCountry(value: unknown): value is ProgrammationCountry {
  return COUNTRIES.includes(value as ProgrammationCountry);
}

export async function GET() {
  const rows = await db.select().from(programmationBlocks);
  return NextResponse.json(rows);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { country, label, startDate, endDate, comment } = body;

  if (!isCountry(country)) {
    return NextResponse.json({ error: "country invalide" }, { status: 400 });
  }

  const [created] = await db
    .insert(programmationBlocks)
    .values({
      country,
      label: typeof label === "string" ? label.trim() : "",
      startDate: startDate || null,
      endDate: endDate || null,
      comment: typeof comment === "string" ? comment : "",
    })
    .returning();

  return NextResponse.json(created, { status: 201 });
}

export async function PUT(request: NextRequest) {
  const body = await request.json();
  const { id, label, startDate, endDate, comment } = body;

  if (!id) {
    return NextResponse.json({ error: "id est requis" }, { status: 400 });
  }

  const updateData: Record<string, unknown> = {};
  if (label !== undefined) updateData.label = String(label).trim();
  if (startDate !== undefined) updateData.startDate = startDate || null;
  if (endDate !== undefined) updateData.endDate = endDate || null;
  if (comment !== undefined) updateData.comment = String(comment);

  const [updated] = await db
    .update(programmationBlocks)
    .set(updateData)
    .where(eq(programmationBlocks.id, id))
    .returning();

  if (!updated) {
    return NextResponse.json({ error: "Bloc introuvable" }, { status: 404 });
  }

  return NextResponse.json(updated);
}

export async function DELETE(request: NextRequest) {
  const body = await request.json();
  const { id } = body;
  if (!id) {
    return NextResponse.json({ error: "id est requis" }, { status: 400 });
  }

  const [deleted] = await db
    .delete(programmationBlocks)
    .where(eq(programmationBlocks.id, id))
    .returning();

  if (!deleted) {
    return NextResponse.json({ error: "Bloc introuvable" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
