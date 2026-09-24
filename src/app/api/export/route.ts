import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { briefs, briefSections } from "@/lib/schema";
import { asc, eq } from "drizzle-orm";
import { cleanExportedHtml, cmsLocalePath } from "@/lib/utils";
import { generateSectionHTML, getSectionVideos } from "@/templates/registry";
import { sectionExportFolders } from "@/lib/section-export-folder";

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
  // Plusieurs sections du même type dans le brief : les suivantes exportent
  // leurs images dans leur propre sous-dossier, sinon les noms de fichiers
  // (quickaccess-3.jpg...) s'écrasent entre sections. Calculé sur toutes les
  // sections, dans l'ordre d'affichage, pour donner le même résultat que le ZIP.
  const siblings = await db
    .select({ id: briefSections.id, type: briefSections.type, title: briefSections.title })
    .from(briefSections)
    .where(eq(briefSections.briefId, section.briefId))
    .orderBy(asc(briefSections.order));

  const ctx = {
    year: brief.year,
    week: brief.week,
    locale: cmsLocalePath(brief.locale),
    sectionFolder: sectionExportFolders(siblings).get(section.id) || undefined,
  };

  // Les templates sans generateHTML (img sous menu, miniature offre) rendent
  // une chaîne vide : seuls leurs fichiers image comptent.
  const html = generateSectionHTML(section.type, section.content, ctx);

  // Les vidéos ne sont plus hébergées ni zippées : l'intégrateur les télécharge
  // à leur adresse et les dépose lui-même au chemin CMS attendu par ce HTML.
  const videos = getSectionVideos(section.type, section.content, ctx);

  return NextResponse.json({ html: cleanExportedHtml(html), type: section.type, videos });
}
