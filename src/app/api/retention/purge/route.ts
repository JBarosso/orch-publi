import { NextResponse } from "next/server";
import {
  computePurgePreview,
  executePurge,
  getRetentionMonths,
} from "@/lib/retention";

// GET = dry-run : aperçu de ce qui serait supprimé, sans rien toucher
export async function GET() {
  const months = await getRetentionMonths();
  const preview = await computePurgePreview(months);
  return NextResponse.json(preview);
}

// POST = purge réelle (briefs traités expirés + assets orphelins expirés)
export async function POST() {
  const months = await getRetentionMonths();
  const result = await executePurge(months);
  return NextResponse.json(result);
}
