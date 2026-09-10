import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { assets } from "@/lib/schema";
import { and, desc, eq, ilike } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import sharp from "sharp";
import { head } from "@vercel/blob";
import {
  putAsset,
  deleteAsset,
  readAsset,
  isTempUploadUrl,
  promoteTempUpload,
} from "@/lib/storage";
import {
  ACCEPTED_FORMATS_LABEL,
  ACCEPTED_SHARP_FORMATS,
  ACCEPTED_VIDEO_MIME_TYPES,
  ASSET_SPECS,
  MAX_SOURCE_BYTES,
  MAX_SOURCE_DIMENSION,
  MAX_TIFF_SOURCE_BYTES,
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

export async function PUT(request: NextRequest) {
  const body = await request.json();
  const { id, label } = body;

  if (!id) {
    return NextResponse.json({ error: "id est requis" }, { status: 400 });
  }

  const [updated] = await db
    .update(assets)
    .set({ label: normalizeAssetLabel(typeof label === "string" ? label : "") })
    .where(eq(assets.id, id))
    .returning();

  if (!updated) {
    return NextResponse.json({ error: "Asset introuvable" }, { status: 404 });
  }

  return NextResponse.json(updated);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  // Le fichier arrive de deux façons :
  // - `sourceUrl` : déjà déposé sur Vercel Blob par le navigateur (upload
  //   direct, cf. src/lib/storage.ts) — seule voie possible en production
  //   au-delà de 4,5 Mo ;
  // - `image` : data URL base64 dans le corps (dev local sans Blob).
  const { image, sourceUrl, crop, label, week, year, type, fromTiff } = body;

  if (!image && !sourceUrl) {
    return NextResponse.json({ error: "Image requise" }, { status: 400 });
  }
  if (sourceUrl && !isTempUploadUrl(sourceUrl)) {
    return NextResponse.json({ error: "Fichier source invalide" }, { status: 400 });
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
    return handleVideoUpload(
      sourceUrl ? { sourceUrl } : { image },
      assetType,
      cleanLabel,
      toIntOrNull(week),
      toIntOrNull(year),
    );
  }

  try {
    const imageBuffer: Buffer = sourceUrl
      ? await readAsset(sourceUrl)
      : Buffer.from(image.replace(/^data:image\/\w+;base64,/, ""), "base64");

    // Upload libre (pas de crop) issu d'un TIFF converti : l'image reçue ici
    // est encore en pleine résolution — plafond TIFF plutôt que le plafond
    // image standard (déjà appliqué au TIFF source par /api/assets/convert-tiff).
    const maxBytes = fromTiff === true ? MAX_TIFF_SOURCE_BYTES : MAX_SOURCE_BYTES;
    if (imageBuffer.byteLength > maxBytes) {
      return NextResponse.json(
        { error: `Image trop lourde (${formatBytes(imageBuffer.byteLength)}). Maximum : ${formatBytes(maxBytes)}.` },
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
    } else {
      // Pas de dimensions imposées (upload libre) : on plafonne quand même le
      // plus grand côté pour que le fichier sauvegardé reste optimisé, sans
      // jamais agrandir une image plus petite que le plafond.
      processed = processed.resize(MAX_SOURCE_DIMENSION, MAX_SOURCE_DIMENSION, {
        fit: "inside",
        withoutEnlargement: true,
      });
    }

    // "source" : format d'origine conservé, ré-encodé pour optimiser le poids.
    // Un AVIF (« heif » pour sharp) tombe dans le cas PNG ci-dessous : sans
    // perte, transparence conservée.
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
    const url = await putAsset(outputBuffer, filename, mimeType);

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
  } finally {
    // Le fichier déposé n'était qu'un intermédiaire : seul l'asset traité est conservé.
    if (sourceUrl) await deleteAsset(sourceUrl);
  }
}

function videoUploadError(mimeType: string, bytes: number): string | null {
  if (!ACCEPTED_VIDEO_MIME_TYPES.includes(mimeType)) {
    return "Format non supporté. Formats acceptés : MP4.";
  }
  if (bytes > MAX_VIDEO_SOURCE_BYTES) {
    return `Vidéo trop lourde (${formatBytes(bytes)}). Maximum : ${formatBytes(MAX_VIDEO_SOURCE_BYTES)}.`;
  }
  return null;
}

async function handleVideoUpload(
  source: { image: string } | { sourceUrl: string },
  assetType: string,
  cleanLabel: string,
  week: number | null,
  year: number | null,
) {
  try {
    let url: string;
    if ("sourceUrl" in source) {
      // Upload direct : on vérifie ce que le navigateur a réellement déposé.
      const { size, contentType } = await head(source.sourceUrl);
      const error = videoUploadError(contentType, size);
      if (error) {
        await deleteAsset(source.sourceUrl);
        return NextResponse.json({ error }, { status: 400 });
      }
      url = await promoteTempUpload(source.sourceUrl, `${uuidv4()}.mp4`, "video/mp4");
    } else {
      const mimeType = /^data:(video\/\w+);base64,/.exec(source.image)?.[1] ?? "";
      const videoBuffer = Buffer.from(source.image.replace(/^data:video\/\w+;base64,/, ""), "base64");
      const error = videoUploadError(mimeType, videoBuffer.byteLength);
      if (error) {
        return NextResponse.json({ error }, { status: 400 });
      }
      url = await putAsset(videoBuffer, `${uuidv4()}.mp4`, "video/mp4");
    }

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

  await deleteAsset(asset.url);
  await db.delete(assets).where(eq(assets.id, id));
  return NextResponse.json({ ok: true });
}
