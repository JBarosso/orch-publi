import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import { MAX_TIFF_SOURCE_BYTES, formatBytes } from "@/lib/upload-specs";

// Les navigateurs ne savent pas décoder le TIFF nativement (ni <img>, ni
// canvas) : ce endpoint le convertit en PNG côté serveur (sharp/libvips)
// avant que le client ne l'injecte dans le flux d'upload/crop habituel, qui
// continue alors comme pour n'importe quel autre format.
//
// Corps brut (binaire), pas de JSON/base64 : un TIFF peut peser plusieurs
// centaines de Mo, et base64+JSON.stringify multiplient par 2-3 la mémoire
// nécessaire côté navigateur pour construire la requête — c'est ce qui
// provoquait un crash "Out of Memory" de l'onglet sur de gros fichiers.
export async function POST(request: NextRequest) {
  const buffer = Buffer.from(await request.arrayBuffer());

  if (buffer.byteLength === 0) {
    return NextResponse.json({ error: "Image requise" }, { status: 400 });
  }

  if (buffer.byteLength > MAX_TIFF_SOURCE_BYTES) {
    return NextResponse.json(
      { error: `Fichier trop lourd (${formatBytes(buffer.byteLength)}). Maximum : ${formatBytes(MAX_TIFF_SOURCE_BYTES)}.` },
      { status: 400 },
    );
  }

  try {
    const metadata = await sharp(buffer).metadata();
    if (metadata.format !== "tiff") {
      return NextResponse.json({ error: "Ce fichier n'est pas un TIFF valide" }, { status: 400 });
    }
    // Réponse binaire directe (pas de base64/JSON) — même raison que côté requête.
    const pngBuffer = await sharp(buffer).png().toBuffer();
    return new NextResponse(new Uint8Array(pngBuffer), {
      headers: { "Content-Type": "image/png" },
    });
  } catch {
    return NextResponse.json({ error: "Impossible de lire ce fichier TIFF" }, { status: 400 });
  }
}
