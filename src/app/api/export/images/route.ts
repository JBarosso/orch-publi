import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { briefs, briefSections } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { join } from "path";
import { readFile } from "fs/promises";
import sharp from "sharp";
import archiver from "archiver";
import { PassThrough } from "stream";
import type { CustomContent, MacaronsContent, MeaContent } from "@/types";

interface ImageEntry {
  imageUrl: string;
  imageWeek: number | null;
  baseName: string;
  // null = dimensions libres (sections personnalisées) : pas de resize forcé
  width: number | null;
  height: number | null;
}

function getMacaronImages(content: MacaronsContent, briefWeek: number): ImageEntry[] {
  return (content?.items ?? [])
    .filter((i) => i.visible && i.imageUrl)
    .map((item) => ({
      imageUrl: item.imageUrl,
      imageWeek: item.imageWeek,
      baseName: `quickaccess-${item.imageId}`,
      width: 70,
      height: 70,
    }));
}

function getMeaImages(content: MeaContent, briefWeek: number): ImageEntry[] {
  return (content?.items ?? [])
    .filter((i) => i.visible && i.imageUrl)
    .map((item, index) => ({
      imageUrl: item.imageUrl,
      imageWeek: item.imageWeek,
      baseName: `mea-${index + 1}`,
      width: 600,
      height: 400,
    }));
}

function getCustomImages(content: CustomContent): ImageEntry[] {
  return (content?.blocks ?? [])
    .filter((b) => b.type === "image" && b.imageUrl)
    .map((block) => ({
      imageUrl: block.imageUrl,
      imageWeek: block.imageWeek,
      baseName: `custom-${block.imageId}`,
      width: null,
      height: null,
    }));
}

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

  let images: ImageEntry[] = [];
  if (section.type === "macarons") {
    images = getMacaronImages(section.content as MacaronsContent, brief.week);
  } else if (section.type === "mea") {
    images = getMeaImages(section.content as MeaContent, brief.week);
  } else if (section.type === "custom") {
    images = getCustomImages(section.content as CustomContent);
  }

  if (images.length === 0) {
    return NextResponse.json({ error: "Aucune image à exporter" }, { status: 400 });
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
    if (section.type === "macarons") {
      allImages.push(...getMacaronImages(section.content as MacaronsContent, brief.week));
    } else if (section.type === "mea") {
      allImages.push(...getMeaImages(section.content as MeaContent, brief.week));
    } else if (section.type === "custom") {
      allImages.push(...getCustomImages(section.content as CustomContent));
    }
  }

  if (allImages.length === 0) {
    return NextResponse.json({ error: "Aucune image à exporter" }, { status: 400 });
  }

  return buildZip(allImages, brief);
}

async function buildZip(images: ImageEntry[], brief: { year: number; week: number; locale: string }) {
  const wk = String(brief.week).padStart(2, "0");
  const folderName = `homepage-${brief.year}-wk${wk}-${brief.locale}`;

  const passthrough = new PassThrough();
  const archive = archiver("zip", { zlib: { level: 9 } });
  archive.pipe(passthrough);

  for (const img of images) {
    const imgWk = String(img.imageWeek ?? brief.week).padStart(2, "0");
    const subFolder = `homepage/${brief.year}/wk${imgWk}/${brief.locale}`;

    try {
      const filePath = join(process.cwd(), "public", img.imageUrl);
      const buffer = await readFile(filePath);

      const jpgPipeline = sharp(buffer);
      if (img.width && img.height) {
        jpgPipeline.resize(img.width, img.height, { fit: "cover" });
      }
      const jpgBuffer = await jpgPipeline
        .flatten({ background: { r: 255, g: 255, b: 255 } })
        .jpeg({ quality: 85 })
        .toBuffer();

      const webpPipeline = sharp(buffer);
      if (img.width && img.height) {
        webpPipeline.resize(img.width, img.height, { fit: "cover" });
      }
      const webpBuffer = await webpPipeline
        .flatten({ background: { r: 255, g: 255, b: 255 } })
        .webp({ quality: 85 })
        .toBuffer();

      archive.append(jpgBuffer, { name: `${subFolder}/${img.baseName}.jpg` });
      archive.append(webpBuffer, { name: `${subFolder}/${img.baseName}.webp` });
    } catch (err) {
      console.error(`Failed to process image for ${img.baseName}:`, err);
    }
  }

  await archive.finalize();

  const chunks: Buffer[] = [];
  for await (const chunk of passthrough) {
    chunks.push(chunk as Buffer);
  }
  const zipBuffer = Buffer.concat(chunks);

  return new NextResponse(zipBuffer, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${folderName}.zip"`,
    },
  });
}
