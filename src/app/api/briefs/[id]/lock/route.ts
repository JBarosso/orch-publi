import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { briefs } from "@/lib/schema";
import {
  acquireLock,
  heartbeatLock,
  readLock,
  releaseLock,
  sessionFingerprint,
} from "@/lib/brief-lock-server";

// Verrou d'édition d'un brief : GET état, POST poser/renouveler, PUT signe
// de vie, DELETE libérer.

type Params = { params: Promise<{ id: string }> };

async function briefExists(id: string): Promise<boolean> {
  const [row] = await db.select({ id: briefs.id }).from(briefs).where(eq(briefs.id, id));
  return !!row;
}

export async function GET(request: NextRequest, { params }: Params) {
  const { id } = await params;
  return NextResponse.json(await readLock(id, sessionFingerprint(request)));
}

export async function POST(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const me = sessionFingerprint(request);
  if (!me) return NextResponse.json({ error: "Session introuvable" }, { status: 401 });
  if (!(await briefExists(id))) {
    return NextResponse.json({ error: "Brief introuvable" }, { status: 404 });
  }
  const status = await acquireLock(id, me);
  return NextResponse.json(status, { status: status.state === "mine" ? 200 : 409 });
}

export async function PUT(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const me = sessionFingerprint(request);
  if (!me) return NextResponse.json({ error: "Session introuvable" }, { status: 401 });
  const status = await heartbeatLock(id, me);
  return NextResponse.json(status, { status: status.state === "mine" ? 200 : 409 });
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const me = sessionFingerprint(request);
  if (me) await releaseLock(id, me);
  return NextResponse.json({ state: "free", expiresAt: null });
}
