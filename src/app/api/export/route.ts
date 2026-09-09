import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { briefs, briefSections } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { cleanExportedHtml, cmsLocalePath } from "@/lib/utils";
import { generateSectionHTML } from "@/templates/registry";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const sectionId = searchParams.get("sectionId");

  if (!sectionId) {
    return NextResponse.json(
      { error: "sectionId requis" },
      { status: 400 },
    );
  }

  const [section] = await db
    .select()
    .from(briefSections)
    .where(eq(briefSections.id, sectionId));

  if (!section) {
    return NextResponse.json(
      { error: "Section introuvable" },
      { status: 404 },
    );
  }

  const [brief] = await db
    .select()
    .from(briefs)
    .where(eq(briefs.id, section.briefId));

  if (!brief) {
    return NextResponse.json(
      { error: "Brief parent introuvable" },
      { status: 404 },
    );
  }

  // Le CMS attend la locale en minuscule dans les chemins d'assets
  // (homepage/{année}/wk{semaine}/fr/...), alors qu'elle est stockée en
  // majuscule ("FR", "BEFR"...) partout ailleurs dans l'outil — et un seul
  // dossier "be" pour BEFR/BENL (cf. cmsLocalePath).
  const ctx = { year: brief.year, week: brief.week, locale: cmsLocalePath(brief.locale) };

  // Les templates sans generateHTML (img sous menu, miniature offre) rendent
  // une chaîne vide : seuls leurs fichiers image comptent.
  const html = generateSectionHTML(section.type, section.content, ctx);

  return NextResponse.json({ html: cleanExportedHtml(html), type: section.type });
}
