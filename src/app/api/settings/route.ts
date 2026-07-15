import { NextRequest, NextResponse } from "next/server";
import {
  getRetentionMonths,
  setRetentionMonths,
  MIN_RETENTION_MONTHS,
  MAX_RETENTION_MONTHS,
} from "@/lib/retention";

export async function GET() {
  const retentionMonths = await getRetentionMonths();
  return NextResponse.json({ retentionMonths });
}

export async function PUT(request: NextRequest) {
  const body = await request.json();
  const months = Number(body.retentionMonths);

  if (
    !Number.isInteger(months) ||
    months < MIN_RETENTION_MONTHS ||
    months > MAX_RETENTION_MONTHS
  ) {
    return NextResponse.json(
      {
        error: `Durée invalide : entre ${MIN_RETENTION_MONTHS} et ${MAX_RETENTION_MONTHS} mois`,
      },
      { status: 400 },
    );
  }

  await setRetentionMonths(months);
  return NextResponse.json({ retentionMonths: months });
}
