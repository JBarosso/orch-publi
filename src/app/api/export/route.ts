import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { briefs, briefSections } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { cleanExportedHtml, cmsLocalePath } from "@/lib/utils";
import { generateMacaronsHTML } from "@/templates/macarons/export";
import { generateMeaHTML } from "@/templates/mea/export";
import { generateCustomHTML } from "@/templates/custom/export";
import { normalizeCustomContent } from "@/templates/custom/schema";
import { generateQuickaccessV2HTML } from "@/templates/macarons-v2/export";
import { generateMeaV2HTML } from "@/templates/mea-v2/export";
import { generateArianeHTML } from "@/templates/ariane/export";
import { generateEditoHTML } from "@/templates/edito/export";
import { generateCarouselHTML } from "@/templates/carousel/export";
import { generateGlobalHeaderHTML } from "@/templates/global-header/export";
import type {
  ArianeContent,
  CarouselContent,
  EditoContent,
  GlobalHeaderContent,
  MacaronsContent,
  MeaContent,
  MeaV2Content,
} from "@/types";

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

  let html = "";
  if (section.type === "macarons") {
    const content = section.content as MacaronsContent;
    html = generateMacaronsHTML(content?.items ?? [], ctx);
  } else if (section.type === "mea") {
    const content = section.content as MeaContent;
    html = generateMeaHTML(content?.items ?? [], ctx);
  } else if (section.type === "custom") {
    html = generateCustomHTML(normalizeCustomContent(section.content), ctx);
  } else if (section.type === "macarons_v2") {
    const content = section.content as MacaronsContent;
    html = generateQuickaccessV2HTML(content?.items ?? [], ctx);
  } else if (section.type === "mea_v2") {
    const content = section.content as MeaV2Content;
    html = generateMeaV2HTML(content, ctx);
  } else if (section.type === "ariane") {
    html = generateArianeHTML(section.content as ArianeContent);
  } else if (section.type === "edito") {
    const content = section.content as EditoContent;
    html = generateEditoHTML(content?.items ?? [], ctx);
  } else if (section.type === "carousel") {
    html = generateCarouselHTML(section.content as CarouselContent, ctx);
  } else if (section.type === "global_header") {
    html = generateGlobalHeaderHTML(section.content as GlobalHeaderContent);
  }
  // "img_sous_menu" : pas de HTML généré, uniquement les fichiers image
  // (cf. section-images.ts) — html reste "".

  return NextResponse.json({ html: cleanExportedHtml(html), type: section.type });
}
