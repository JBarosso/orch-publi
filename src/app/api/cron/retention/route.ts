import { NextRequest, NextResponse } from "next/server";
import { runScheduledPurge } from "@/lib/retention";

// Appelée chaque nuit par le cron Vercel (vercel.json). Le cron n'a pas de
// cookie de session : la route est exemptée dans src/proxy.ts et protégée ici
// par CRON_SECRET, que Vercel envoie en en-tête Authorization quand la
// variable d'environnement est définie.
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  // Sans secret configuré, "Bearer " suffirait à déclencher une suppression.
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const report = await runScheduledPurge();
  return NextResponse.json(report, { status: report.error ? 500 : 200 });
}
