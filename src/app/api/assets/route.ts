import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { assets } from "@/lib/schema";
import { and, desc, eq, ilike } from "drizzle-orm";
import { writeFile, unlink } from "fs/promises";
import { join } from "path";
import { v4 as uuidv4 } from "uuid";
import sharp from "sharp";

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
  const { image, crop, label, week, year, type, targetWidth, targetHeight } = body;

  if (!image) {
    return NextResponse.json({ error: "Image requise" }, { status: 400 });
  }

  try {
    const base64Data = image.replace(/^data:image\/\w+;base64,/, "");
    const imageBuffer = Buffer.from(base64Data, "base64");

    let processed = sharp(imageBuffer);

    if (crop) {
      processed = processed.extract({
        left: Math.round(crop.x),
        top: Math.round(crop.y),
        width: Math.round(crop.width),
        height: Math.round(crop.height),
      });
    }

    // Use provided target dimensions or default to 200x200 (macarons)
    const w = targetWidth || 200;
    const h = targetHeight || 200;
    processed = processed.resize(w, h, { fit: "contain", background: { r: 255, g: 255, b: 255, alpha: 1 } });
    // Flatten alpha channel to white background
    processed = processed.flatten({ background: { r: 255, g: 255, b: 255 } });
    const outputBuffer = await processed.png({ quality: 85 }).toBuffer();

    const filename = `${uuidv4()}.png`;
    const filepath = join(process.cwd(), "public", "uploads", filename);
    await writeFile(filepath, outputBuffer);

    const url = `/uploads/${filename}`;

    let asset;
    try {
      [asset] = await db
        .insert(assets)
        .values({
          url,
          type: typeof type === "string" ? type : "other",
          label: label || "",
          mimeType: "image/png",
          week: Number.isInteger(week) ? week : null,
          year: Number.isInteger(year) ? year : null,
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
          label: label || "",
          mimeType: "image/png",
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
