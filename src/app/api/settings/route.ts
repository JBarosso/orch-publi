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
  getAutoPurgeEnabled,
  setAutoPurgeEnabled,
  getLastScheduledPurge,
} from "@/lib/retention";
import { getHeaderColors, setHeaderColors, type HeaderColor } from "@/lib/header-colors";

export async function GET() {
  const [retentionMonths, videoRetentionDays, headerColors, autoPurgeEnabled, lastScheduledPurge] =
    await Promise.all([
      getRetentionMonths(),
      getVideoRetentionDays(),
      getHeaderColors(),
      getAutoPurgeEnabled(),
      getLastScheduledPurge(),
    ]);
  return NextResponse.json({
    retentionMonths,
    videoRetentionDays,
    headerColors,
    autoPurgeEnabled,
    lastScheduledPurge,
    // Sans secret, la route de cron refuse tous les appels : le passage
    // automatique ne tournerait jamais, et l'interface doit le dire.
    cronConfigured: !!process.env.CRON_SECRET,
  });
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

  if (body.autoPurgeEnabled !== undefined) {
    if (typeof body.autoPurgeEnabled !== "boolean") {
      return NextResponse.json(
        { error: "autoPurgeEnabled doit être un booléen" },
        { status: 400 },
      );
    }
    await setAutoPurgeEnabled(body.autoPurgeEnabled);
    return NextResponse.json({ autoPurgeEnabled: body.autoPurgeEnabled });
  }

  if (body.headerColors !== undefined) {
    const colors = body.headerColors;
    const isValidColor = (c: unknown): c is HeaderColor =>
      typeof c === "object" &&
      c !== null &&
      typeof (c as HeaderColor).name === "string" &&
      (c as HeaderColor).name.trim() !== "" &&
      /^#[0-9a-fA-F]{6}$/.test((c as HeaderColor).hex);

    if (!Array.isArray(colors) || !colors.every(isValidColor)) {
      return NextResponse.json(
        { error: "Couleurs invalides : chaque entrée doit avoir un nom et un hex #RRGGBB" },
        { status: 400 },
      );
    }
    await setHeaderColors(colors);
    return NextResponse.json({ headerColors: colors });
  }

  return NextResponse.json({ error: "Aucun champ à mettre à jour" }, { status: 400 });
}
