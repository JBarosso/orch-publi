import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { assets } from "@/lib/schema";
import { and, desc, eq, ilike } from "drizzle-orm";
import { writeFile, unlink } from "fs/promises";
import { join } from "path";
import { v4 as uuidv4 } from "uuid";
import sharp from "sharp";
import {
  ACCEPTED_FORMATS_LABEL,
  ACCEPTED_SHARP_FORMATS,
  ACCEPTED_VIDEO_MIME_TYPES,
  ASSET_SPECS,
  MAX_SOURCE_BYTES,
  MAX_VIDEO_SOURCE_BYTES,
  formatBytes,
  normalizeAssetLabel,
  resolveAssetType,
} from "@/lib/upload-specs";

function toIntOrNull(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isInteger(n) ? n : null;
}

function hasMissingColumnError(err: unknown) {
  if (!err || typeof err !== "object") return false;
  const code = (err as { code?: string }).code;
  const causeCode = (err as { cause?: { code?: string } }).cause?.code;
  return code === "42703" || causeCode === "42703";
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const search = searchParams.get("search");
  const week = searchParams.get("week");
  const year = searchParams.get("year");
  const type = searchParams.get("type");

  const conditions = [];
  if (search) {
    conditions.push(ilike(assets.label, `%${search}%`));
  }
  if (week) {
    conditions.push(eq(assets.week, Number(week)));
  }
  if (year) {
    conditions.push(eq(assets.year, Number(year)));
  }
  if (type) {
    conditions.push(eq(assets.type, type));
  }

  let result;
  try {
    result = await db
      .select()
      .from(assets)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(assets.createdAt))
      .limit(50);
  } catch (err) {
    if (!hasMissingColumnError(err)) {
      throw err;
    }
    // Backward compatibility if DB migration for year/week is not applied yet.
    result = await db
      .select({
        id: assets.id,
        url: assets.url,
        label: assets.label,
        mimeType: assets.mimeType,
        createdAt: assets.createdAt,
      })
      .from(assets)
      .where(search ? ilike(assets.label, `%${search}%`) : undefined)
      .orderBy(desc(assets.createdAt))
      .limit(50);
  }

  return NextResponse.json(
    result.map((asset) => ({
      ...asset,
      type: "type" in asset ? asset.type ?? "other" : "other",
      year: "year" in asset ? asset.year : null,
      week: "week" in asset ? asset.week : null,
    })),
  );
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { image, crop, label, week, year, type } = body;

  if (!image) {
    return NextResponse.json({ error: "Image requise" }, { status: 400 });
  }

  const assetType = resolveAssetType(type);
  const spec = ASSET_SPECS[assetType];

  const cleanLabel = normalizeAssetLabel(typeof label === "string" ? label : "");
  if (spec.requireLabel && !cleanLabel) {
    return NextResponse.json(
      { error: `Label requis pour une image ${spec.displayName}` },
      { status: 400 },
    );
  }

  // Vidéo (carte focus MEA v2) : pipeline dédiée, pas de sharp.
  if (spec.kind === "video") {
    return handleVideoUpload(image, assetType, cleanLabel, toIntOrNull(week), toIntOrNull(year));
  }

  try {
    const base64Data = image.replace(/^data:image\/\w+;base64,/, "");
    const imageBuffer = Buffer.from(base64Data, "base64");

    if (imageBuffer.byteLength > MAX_SOURCE_BYTES) {
      return NextResponse.json(
        { error: `Image trop lourde (${formatBytes(imageBuffer.byteLength)}). Maximum : ${formatBytes(MAX_SOURCE_BYTES)}.` },
        { status: 400 },
      );
    }

    const metadata = await sharp(imageBuffer).metadata();
    if (!metadata.format || !ACCEPTED_SHARP_FORMATS.includes(metadata.format)) {
      return NextResponse.json(
        { error: `Format non supporté. Formats acceptés : ${ACCEPTED_FORMATS_LABEL}.` },
        { status: 400 },
      );
    }

    let processed = sharp(imageBuffer);

    if (crop) {
      processed = processed.extract({
        left: Math.round(crop.x),
        top: Math.round(crop.y),
        width: Math.round(crop.width),
        height: Math.round(crop.height),
      });
    }

    // Dimensions imposées par le type d'asset — le client ne peut pas les contourner.
    // Sans dimensions cibles (type "other"), l'image garde ses dimensions d'origine.
    if (spec.targetWidth && spec.targetHeight) {
      processed = processed
        .resize(spec.targetWidth, spec.targetHeight, {
          fit: "contain",
          background: { r: 255, g: 255, b: 255, alpha: 1 },
        })
        .flatten({ background: { r: 255, g: 255, b: 255 } });
    }

    // "source" : format d'origine conservé, ré-encodé pour optimiser le poids
    const outputFormat =
      spec.outputFormat === "source"
        ? (metadata.format as "jpeg" | "png" | "webp")
        : spec.outputFormat;

    let outputBuffer: Buffer;
    let extension: string;
    let mimeType: string;
    if (outputFormat === "jpeg") {
      outputBuffer = await processed
        .flatten({ background: { r: 255, g: 255, b: 255 } })
        .jpeg({ quality: 85 })
        .toBuffer();
      extension = "jpg";
      mimeType = "image/jpeg";
    } else if (outputFormat === "webp") {
      outputBuffer = await processed.webp({ quality: 85 }).toBuffer();
      extension = "webp";
      mimeType = "image/webp";
    } else {
      // PNG : compression sans perte (la transparence est conservée en upload libre)
      outputBuffer = await processed.png({ compressionLevel: 9 }).toBuffer();
      extension = "png";
      mimeType = "image/png";
    }

    const filename = `${uuidv4()}.${extension}`;
    const filepath = join(process.cwd(), "public", "uploads", filename);
    await writeFile(filepath, outputBuffer);

    const url = `/uploads/${filename}`;

    let asset;
    try {
      [asset] = await db
        .insert(assets)
        .values({
          url,
          type: assetType,
          label: cleanLabel,
          mimeType,
          week: toIntOrNull(week),
          year: toIntOrNull(year),
        })
        .returning();
    } catch (err) {
      if (!hasMissingColumnError(err)) {
        throw err;
      }
      [asset] = await db
        .insert(assets)
        .values({
          url,
          label: cleanLabel,
          mimeType,
        })
        .returning();
    }

    return NextResponse.json(asset, { status: 201 });
  } catch (err) {
    console.error("Image processing error:", err);
    return NextResponse.json(
      { error: "Erreur lors du traitement de l'image" },
      { status: 500 },
    );
  }
}

async function handleVideoUpload(
  image: string,
  assetType: string,
  cleanLabel: string,
  week: number | null,
  year: number | null,
) {
  const mimeMatch = /^data:(video\/\w+);base64,/.exec(image);
  const mimeType = mimeMatch?.[1] ?? "";
  if (!ACCEPTED_VIDEO_MIME_TYPES.includes(mimeType)) {
    return NextResponse.json(
      { error: "Format non supporté. Formats acceptés : MP4." },
      { status: 400 },
    );
  }

  const base64Data = image.replace(/^data:video\/\w+;base64,/, "");
  const videoBuffer = Buffer.from(base64Data, "base64");

  if (videoBuffer.byteLength > MAX_VIDEO_SOURCE_BYTES) {
    return NextResponse.json(
      { error: `Vidéo trop lourde (${formatBytes(videoBuffer.byteLength)}). Maximum : ${formatBytes(MAX_VIDEO_SOURCE_BYTES)}.` },
      { status: 400 },
    );
  }

  try {
    const filename = `${uuidv4()}.mp4`;
    const filepath = join(process.cwd(), "public", "uploads", filename);
    await writeFile(filepath, videoBuffer);

    const url = `/uploads/${filename}`;

    let asset;
    try {
      [asset] = await db
        .insert(assets)
        .values({
          url,
          type: assetType,
          label: cleanLabel,
          mimeType: "video/mp4",
          week,
          year,
        })
        .returning();
    } catch (err) {
      if (!hasMissingColumnError(err)) {
        throw err;
      }
      [asset] = await db
        .insert(assets)
        .values({ url, label: cleanLabel, mimeType: "video/mp4" })
        .returning();
    }

    return NextResponse.json(asset, { status: 201 });
  } catch (err) {
    console.error("Video processing error:", err);
    return NextResponse.json(
      { error: "Erreur lors du traitement de la vidéo" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "id requis" }, { status: 400 });
  }

  const [asset] = await db.select().from(assets).where(eq(assets.id, id));
  if (!asset) {
    return NextResponse.json({ error: "Asset introuvable" }, { status: 404 });
  }

  try {
    const filepath = join(process.cwd(), "public", asset.url);
    await unlink(filepath).catch(() => { });
  } catch {
    // ignore file deletion errors
  }

  await db.delete(assets).where(eq(assets.id, id));
  return NextResponse.json({ ok: true });
}
