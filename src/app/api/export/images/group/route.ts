import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { briefs, briefSections } from "@/lib/schema";
import { inArray } from "drizzle-orm";
import { getSectionImages } from "@/lib/section-images";
import { buildZipBuffer, type ZipGroup } from "@/lib/build-zip";
import { normalizeTypeLabel } from "@/lib/section-labels";

// Caractères interdits dans un nom de dossier ZIP sur la plupart des OS.
function sanitizeFolderName(name: string): string {
  return name.replace(/[/\\:*?"<>|]/g, "-").trim() || "sans-nom";
}

// Export ZIP multi-briefs (mode dev, dashboard) : 1 dossier par type de
// section (template), et à l'intérieur 1 dossier par section ("tab" —
// nom du brief + titre, une section = un tab même si un brief a plusieurs
// sections du même type).
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const sectionIds = searchParams.get("sectionIds")?.split(",").filter(Boolean) ?? [];

  if (sectionIds.length === 0) {
    return NextResponse.json({ error: "sectionIds est requis" }, { status: 400 });
  }

  const sections = await db
    .select()
    .from(briefSections)
    .where(inArray(briefSections.id, sectionIds));

  if (sections.length === 0) {
    return NextResponse.json({ error: "Aucune section trouvée" }, { status: 404 });
  }

  const briefIds = [...new Set(sections.map((s) => s.briefId))];
  const briefRows = await db.select().from(briefs).where(inArray(briefs.id, briefIds));
  const briefById = new Map(briefRows.map((b) => [b.id, b]));

  const groups: ZipGroup[] = [];
  for (const section of sections) {
    const brief = briefById.get(section.briefId);
    if (!brief) continue;

    const images = getSectionImages(section.type, section.content);
    if (images.length === 0) continue;

    const typeLabel = sanitizeFolderName(normalizeTypeLabel(section.type));
    const briefLabel = sanitizeFolderName(brief.name || brief.slug);
    const tabLabel = sanitizeFolderName(`${briefLabel} - ${section.title || typeLabel}`);

    groups.push({
      folderPrefix: `${typeLabel}/${tabLabel}`,
      images,
      year: brief.year,
      week: brief.week,
      locale: brief.locale,
    });
  }

  if (groups.length === 0) {
    return NextResponse.json({ error: "Aucun fichier à exporter" }, { status: 400 });
  }

  const zipBuffer = await buildZipBuffer(groups);

  return new NextResponse(new Uint8Array(zipBuffer), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="export-groupe.zip"`,
    },
  });
}
