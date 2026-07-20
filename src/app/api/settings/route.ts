import { NextRequest, NextResponse } from "next/server";
import {
  getRetentionMonths,
  setRetentionMonths,
  MIN_RETENTION_MONTHS,
  MAX_RETENTION_MONTHS,
  getVideoRetentionDays,
  setVideoRetentionDays,
  MIN_VIDEO_RETENTION_DAYS,
  MAX_VIDEO_RETENTION_DAYS,
} from "@/lib/retention";

export async function GET() {
  const [retentionMonths, videoRetentionDays] = await Promise.all([
    getRetentionMonths(),
    getVideoRetentionDays(),
  ]);
  return NextResponse.json({ retentionMonths, videoRetentionDays });
}

export async function PUT(request: NextRequest) {
  const body = await request.json();

  if (body.retentionMonths !== undefined) {
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

  if (body.videoRetentionDays !== undefined) {
    const days = Number(body.videoRetentionDays);
    if (
      !Number.isInteger(days) ||
      days < MIN_VIDEO_RETENTION_DAYS ||
      days > MAX_VIDEO_RETENTION_DAYS
    ) {
      return NextResponse.json(
        {
          error: `Durée invalide : entre ${MIN_VIDEO_RETENTION_DAYS} et ${MAX_VIDEO_RETENTION_DAYS} jours`,
        },
        { status: 400 },
      );
    }
    await setVideoRetentionDays(days);
    return NextResponse.json({ videoRetentionDays: days });
  }

  return NextResponse.json({ error: "Aucun champ à mettre à jour" }, { status: 400 });
}
