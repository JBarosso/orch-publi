import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { briefs, briefSections } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { join } from "path";
import { readFile } from "fs/promises";
import sharp from "sharp";
import archiver from "archiver";
import { PassThrough } from "stream";
import type { MacaronsContent } from "@/types";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const sectionId = searchParams.get("sectionId");

  if (!sectionId) {
    return NextResponse.json({ error: "sectionId requis" }, { status: 400 });
  }

  const [section] = await db
    .select()
    .from(briefSections)
    .where(eq(briefSections.id, sectionId));

  if (!section || section.type !== "macarons") {
    return NextResponse.json({ error: "Section introuvable" }, { status: 404 });
  }

  const [brief] = await db
    .select()
    .from(briefs)
    .where(eq(briefs.id, section.briefId));

  if (!brief) {
    return NextResponse.json({ error: "Brief introuvable" }, { status: 404 });
  }

  const content = section.content as MacaronsContent;
  const items = (content?.items ?? []).filter((i) => i.visible && i.imageUrl);

  if (items.length === 0) {
    return NextResponse.json(
      { error: "Aucune image à exporter" },
      { status: 400 },
    );
  }

  const wk = String(brief.week).padStart(2, "0");
  const folderName = `homepage-${brief.year}-wk${wk}-${brief.locale}`;

  const passthrough = new PassThrough();
  const archive = archiver("zip", { zlib: { level: 9 } });
  archive.pipe(passthrough);

  for (const item of items) {
    const imgWk = String(item.imageWeek ?? brief.week).padStart(2, "0");
    const baseName = `quickaccess-${item.imageId}`;
    const subFolder = `homepage/${brief.year}/wk${imgWk}/${brief.locale}`;

    try {
      const filePath = join(process.cwd(), "public", item.imageUrl);
      const buffer = await readFile(filePath);

      const jpgBuffer = await sharp(buffer)
        .resize(70, 70, { fit: "cover" })
        .jpeg({ quality: 85 })
        .toBuffer();

      const webpBuffer = await sharp(buffer)
        .resize(70, 70, { fit: "cover" })
        .webp({ quality: 85 })
        .toBuffer();

      archive.append(jpgBuffer, { name: `${subFolder}/${baseName}.jpg` });
      archive.append(webpBuffer, { name: `${subFolder}/${baseName}.webp` });
    } catch (err) {
      console.error(`Failed to process image for ${item.imageId}:`, err);
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
