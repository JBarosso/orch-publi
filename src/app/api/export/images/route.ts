import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { briefs, briefSections } from "@/lib/schema";
import { eq } from "drizzle-orm";
import sharp from "sharp";
import { readAsset } from "@/lib/storage";
import archiver from "archiver";
import { PassThrough } from "stream";
import type {
  CarouselContent,
  CustomContent,
  EditoContent,
  MacaronsContent,
  MeaContent,
  MeaV2Content,
} from "@/types";

interface ImageEntry {
  imageUrl: string;
  imageWeek: number | null;
  baseName: string;
  // null = dimensions libres (sections personnalisées) : pas de resize forcé
  width: number | null;
  height: number | null;
  // Vidéo (carte focus MEA v2) : copiée telle quelle dans le zip, pas de sharp
  isVideo?: boolean;
}

function getMacaronImages(content: MacaronsContent, briefWeek: number): ImageEntry[] {
  return (content?.items ?? [])
    .filter((i) => i.visible && i.imageUrl)
    .map((item, index) => ({
      imageUrl: item.imageUrl,
      imageWeek: item.imageWeek,
      baseName: `quickaccess-${item.exportPosition ?? index + 1}`,
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
      baseName: `mea-${item.exportPosition ?? index + 1}`,
      width: 600,
      height: 400,
    }));
}

function getEditoImages(content: EditoContent): ImageEntry[] {
  return (content?.items ?? [])
    .filter((i) => i.imageUrl)
    .map((item, index) => ({
      imageUrl: item.imageUrl,
      imageWeek: item.imageWeek,
      baseName: `edito-${item.exportPosition ?? index + 1}`,
      width: 370,
      height: 210,
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

function getMacaronsV2Images(content: MacaronsContent): ImageEntry[] {
  return (content?.items ?? [])
    .filter((i) => i.visible && i.imageUrl)
    .map((item, index) => ({
      imageUrl: item.imageUrl,
      imageWeek: item.imageWeek,
      baseName: `quickaccess-${item.exportPosition ?? index + 1}`,
      width: 200,
      height: 300,
    }));
}

function getMeaV2Images(content: MeaV2Content): ImageEntry[] {
  const entries: ImageEntry[] = (content?.cards ?? [])
    .filter((c) => c.imageUrl)
    .map((card, index) => ({
      imageUrl: card.imageUrl,
      imageWeek: card.imageWeek,
      baseName: `mea-${index + 1}`,
      width: 600,
      height: 500,
    }));

  const focus = content?.focus;
  if (focus?.imageUrl) {
    // Vignette (poster) : toujours exportée en image, même en mode vidéo
    entries.push({
      imageUrl: focus.imageUrl,
      imageWeek: focus.imageWeek,
      baseName: "mea-5",
      width: 600,
      height: 700,
    });
  }
  if (focus?.mediaType === "video" && focus.videoUrl) {
    entries.push({
      imageUrl: focus.videoUrl,
      imageWeek: focus.imageWeek,
      baseName: "mea-5",
      width: null,
      height: null,
      isVideo: true,
    });
  }

  return entries;
}

function getCarouselImages(content: CarouselContent): ImageEntry[] {
  const entries: ImageEntry[] = [];
  (content?.slides ?? []).forEach((slide, index) => {
    const slot = index + 1;
    if (slide.imageUrl) {
      // Fond (ou vignette si vidéo) : toujours exporté en image
      entries.push({
        imageUrl: slide.imageUrl,
        imageWeek: slide.imageWeek,
        baseName: `carousel-${slot}`,
        width: 1920,
        height: 600,
      });
    }
    if (slide.mediaType === "video" && slide.videoUrl) {
      entries.push({
        imageUrl: slide.videoUrl,
        imageWeek: slide.imageWeek,
        baseName: `carousel-${slot}`,
        width: null,
        height: null,
        isVideo: true,
      });
    }
    if (slide.titleType === "image" && slide.titleImageUrl) {
      entries.push({
        imageUrl: slide.titleImageUrl,
        imageWeek: slide.titleImageWeek,
        baseName: `carousel-${slot}-title`,
        width: null,
        height: null,
      });
    }
  });
  return entries;
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
  } else if (section.type === "macarons_v2") {
    images = getMacaronsV2Images(section.content as MacaronsContent);
  } else if (section.type === "mea_v2") {
    images = getMeaV2Images(section.content as MeaV2Content);
  } else if (section.type === "edito") {
    images = getEditoImages(section.content as EditoContent);
  } else if (section.type === "carousel") {
    images = getCarouselImages(section.content as CarouselContent);
  }

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
    if (section.type === "macarons") {
      allImages.push(...getMacaronImages(section.content as MacaronsContent, brief.week));
    } else if (section.type === "mea") {
      allImages.push(...getMeaImages(section.content as MeaContent, brief.week));
    } else if (section.type === "custom") {
      allImages.push(...getCustomImages(section.content as CustomContent));
    } else if (section.type === "macarons_v2") {
      allImages.push(...getMacaronsV2Images(section.content as MacaronsContent));
    } else if (section.type === "mea_v2") {
      allImages.push(...getMeaV2Images(section.content as MeaV2Content));
    } else if (section.type === "edito") {
      allImages.push(...getEditoImages(section.content as EditoContent));
    } else if (section.type === "carousel") {
      allImages.push(...getCarouselImages(section.content as CarouselContent));
    }
  }

  if (allImages.length === 0) {
    return NextResponse.json({ error: "Aucun fichier à exporter" }, { status: 400 });
  }

  return buildZip(allImages, brief);
}

async function buildZip(images: ImageEntry[], brief: { year: number; week: number; locale: string }) {
  const wk = String(brief.week).padStart(2, "0");
  const folderName = `homepage-${brief.year}-wk${wk}-${brief.locale}`;

  const passthrough = new PassThrough();
  const archive = archiver("zip", { zlib: { level: 9 } });
  archive.pipe(passthrough);

  // Doit démarrer AVANT (et tourner pendant) les archive.append() ci-dessous :
  // archiver met en file d'attente les entrées et attend que le flux de
  // sortie soit lu pour passer à la suivante. Avec 2+ grosses entrées non
  // compressibles (vidéos), ne lire qu'après finalize() bloque indéfiniment
  // (deadlock reproduit et confirmé) — la lecture doit être concurrente.
  const chunks: Buffer[] = [];
  const drainPromise = (async () => {
    for await (const chunk of passthrough) {
      chunks.push(chunk as Buffer);
    }
  })();

  for (const img of images) {
    const imgWk = String(img.imageWeek ?? brief.week).padStart(2, "0");
    // Chemin CMS : locale en minuscule (doit matcher le <img src> exporté)
    const subFolder = `homepage/${brief.year}/wk${imgWk}/${brief.locale.toLowerCase()}`;

    try {
      const buffer = await readAsset(img.imageUrl);

      if (img.isVideo) {
        // Vidéo (carte focus MEA v2) : copiée telle quelle, pas de passage par sharp.
        // store:true = pas de tentative de compression deflate — une vidéo est déjà
        // compressée (données quasi incompressibles), zlib niveau 9 dessus peut
        // prendre plusieurs minutes pour rien (c'était la cause d'un export qui
        // semblait rester bloqué indéfiniment).
        archive.append(buffer, { name: `${subFolder}/${img.baseName}.mp4`, store: true });
        continue;
      }

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
  await drainPromise;
  const zipBuffer = Buffer.concat(chunks);

  return new NextResponse(zipBuffer, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${folderName}.zip"`,
    },
  });
}
