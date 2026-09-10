import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { briefs, briefSections } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { getSectionImages } from "@/templates/registry";
import type { ImageEntry } from "@/lib/section-images";
import { prepareZip, streamZip } from "@/lib/build-zip";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const sectionId = searchParams.get("sectionId");
  const briefId = searchParams.get("briefId");

  // If briefId is provided, export ALL images from ALL sections
  if (briefId) {
    return exportAllImages(briefId);
  }

  // Otherwise export images for a single section
  if (!sectionId) {
    return NextResponse.json({ error: "sectionId ou briefId requis" }, { status: 400 });
  }

  const [section] = await db
    .select()
    .from(briefSections)
    .where(eq(briefSections.id, sectionId));

  if (!section) {
    return NextResponse.json({ error: "Section introuvable" }, { status: 404 });
  }

  const [brief] = await db
    .select()
    .from(briefs)
    .where(eq(briefs.id, section.briefId));

  if (!brief) {
    return NextResponse.json({ error: "Brief introuvable" }, { status: 404 });
  }

  const images = getSectionImages(section.type, section.content);

  if (images.length === 0) {
    return NextResponse.json({ error: "Aucun fichier à exporter" }, { status: 400 });
  }

  return buildZip(images, brief);
}

async function exportAllImages(briefId: string) {
  const [brief] = await db
    .select()
    .from(briefs)
    .where(eq(briefs.id, briefId));

  if (!brief) {
    return NextResponse.json({ error: "Brief introuvable" }, { status: 404 });
  }

  const sections = await db
    .select()
    .from(briefSections)
    .where(eq(briefSections.briefId, briefId));

  const allImages: ImageEntry[] = [];
  // Les sections marquées non exportables (toggle "Export" off) sont ignorées
  for (const section of sections.filter((s) => s.visible !== false)) {
    allImages.push(...getSectionImages(section.type, section.content));
  }

  if (allImages.length === 0) {
    return NextResponse.json({ error: "Aucun fichier à exporter" }, { status: 400 });
  }

  return buildZip(allImages, brief);
}

async function buildZip(images: ImageEntry[], brief: { year: number; week: number; locale: string }) {
  const wk = String(brief.week).padStart(2, "0");
  const folderName = `homepage-${brief.year}-wk${wk}-${brief.locale}`;

  const prepared = await prepareZip([
    { folderPrefix: "", images, year: brief.year, week: brief.week, locale: brief.locale },
  ]);

  // Aucun fichier produit : renvoyer une archive vide en 200 laisserait croire
  // que l'export a fonctionné. Décidé avant de streamer : une fois le corps
  // de la réponse ouvert, on ne peut plus basculer vers un JSON d'erreur.
  if (prepared.failed.length === images.length) {
    return NextResponse.json(
      {
        error:
          "Aucune image n'a pu être lue (stockage indisponible ?). L'export est vide, rien n'a été téléchargé.",
        failed: prepared.failed,
      },
      { status: 502 },
    );
  }

  // Réponse streamée : pas de ZIP entier assemblé en mémoire, ce qui
  // plafonnerait sinon l'export à 4,5 Mo sur Vercel (limite de toute
  // fonction, streaming excepté).
  return new NextResponse(streamZip(prepared), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${folderName}.zip"`,
      // Export partiel : le détail est aussi dans _IMAGES-MANQUANTES.txt au
      // sein de l'archive.
      ...(prepared.failed.length > 0 ? { "X-Export-Images-Manquantes": String(prepared.failed.length) } : {}),
    },
  });
}
