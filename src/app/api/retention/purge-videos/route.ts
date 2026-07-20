import { NextResponse } from "next/server";
import {
  computeVideoPurgePreview,
  executeVideoPurge,
  getVideoRetentionDays,
} from "@/lib/retention";

// GET = dry-run : aperçu des vidéos MEA v2 expirées, sans rien toucher
export async function GET() {
  const days = await getVideoRetentionDays();
  const preview = await computeVideoPurgePreview(days);
  return NextResponse.json(preview);
}

// POST = purge manuelle immédiate (la purge automatique tourne aussi en tâche
// de fond, voir src/instrumentation.ts) — utile pour forcer sans attendre.
export async function POST() {
  const days = await getVideoRetentionDays();
  const result = await executeVideoPurge(days);
  return NextResponse.json(result);
}
