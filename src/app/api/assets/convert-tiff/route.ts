import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import { MAX_SOURCE_BYTES, formatBytes } from "@/lib/upload-specs";

// Les navigateurs ne savent pas décoder le TIFF nativement (ni <img>, ni
// canvas) : ce endpoint le convertit en PNG côté serveur (sharp/libvips)
// avant que le client ne l'injecte dans le flux d'upload/crop habituel, qui
// continue alors comme pour n'importe quel autre format.
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { image } = body;

  if (!image) {
    return NextResponse.json({ error: "Image requise" }, { status: 400 });
  }

  // Ne pas dépendre du préfixe mime de la data URL : Chrome ne reconnaît
  // pas toujours le type d'un .tif (comme pour le .mp4 ailleurs dans l'app)
  // et peut produire "data:;base64,..." ou "data:application/octet-stream;...".
  const base64Data = image.slice(image.indexOf(",") + 1);
  const buffer = Buffer.from(base64Data, "base64");

  if (buffer.byteLength > MAX_SOURCE_BYTES) {
    return NextResponse.json(
      { error: `Fichier trop lourd (${formatBytes(buffer.byteLength)}). Maximum : ${formatBytes(MAX_SOURCE_BYTES)}.` },
      { status: 400 },
    );
  }

  try {
    const metadata = await sharp(buffer).metadata();
    if (metadata.format !== "tiff") {
      return NextResponse.json({ error: "Ce fichier n'est pas un TIFF valide" }, { status: 400 });
    }
    const pngBuffer = await sharp(buffer).png().toBuffer();
    return NextResponse.json({ image: `data:image/png;base64,${pngBuffer.toString("base64")}` });
  } catch {
    return NextResponse.json({ error: "Impossible de lire ce fichier TIFF" }, { status: 400 });
  }
}
