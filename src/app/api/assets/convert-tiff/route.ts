import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import { v4 as uuidv4 } from "uuid";
import { MAX_TIFF_SOURCE_BYTES, formatBytes } from "@/lib/upload-specs";
import {
  TEMP_UPLOAD_PREFIX,
  deleteAsset,
  isTempUploadUrl,
  putAsset,
  readAsset,
} from "@/lib/storage";

// Les navigateurs ne savent pas décoder le TIFF nativement (ni <img>, ni
// canvas) : ce endpoint le convertit en PNG côté serveur (sharp/libvips)
// avant que le client ne l'injecte dans le flux d'upload/crop habituel, qui
// continue alors comme pour n'importe quel autre format.
//
// Deux modes :
// - upload direct (JSON { sourceUrl }) : le TIFF est déjà sur Vercel Blob sous
//   tmp/. Le PNG converti y est déposé aussi et seule son URL est renvoyée —
//   sur Vercel, requête comme réponse d'une fonction sont plafonnées à 4,5 Mo
//   (erreur 413), seuil qu'un TIFF et sa conversion dépassent vite.
// - corps binaire brut (dev local sans Blob) : pas de JSON/base64, qui
//   multiplieraient par 2-3 la mémoire nécessaire côté navigateur pour
//   construire la requête — c'est ce qui provoquait un crash "Out of Memory"
//   de l'onglet sur de gros fichiers.
export async function POST(request: NextRequest) {
  if (request.headers.get("content-type")?.includes("application/json")) {
    const { sourceUrl } = await request.json().catch(() => ({}));
    if (!isTempUploadUrl(sourceUrl)) {
      return NextResponse.json({ error: "Fichier source invalide" }, { status: 400 });
    }
    try {
      const converted = await convertTiff(await readAsset(sourceUrl));
      if ("error" in converted) {
        return NextResponse.json({ error: converted.error }, { status: 400 });
      }
      // Aperçu de travail : effacé par le ménage quotidien de tmp/.
      const url = await putAsset(converted.png, `${TEMP_UPLOAD_PREFIX}${uuidv4()}.png`, "image/png");
      return NextResponse.json({ url });
    } catch (err) {
      console.error("TIFF conversion error:", err);
      return NextResponse.json(
        { error: "Erreur lors de la conversion du fichier TIFF" },
        { status: 500 },
      );
    } finally {
      await deleteAsset(sourceUrl);
    }
  }

  const converted = await convertTiff(Buffer.from(await request.arrayBuffer()));
  if ("error" in converted) {
    return NextResponse.json({ error: converted.error }, { status: 400 });
  }
  // Réponse binaire directe (pas de base64/JSON) — même raison que côté requête.
  return new NextResponse(new Uint8Array(converted.png), {
    headers: { "Content-Type": "image/png" },
  });
}

async function convertTiff(buffer: Buffer): Promise<{ png: Buffer } | { error: string }> {
  if (buffer.byteLength === 0) {
    return { error: "Image requise" };
  }
  if (buffer.byteLength > MAX_TIFF_SOURCE_BYTES) {
    return {
      error: `Fichier trop lourd (${formatBytes(buffer.byteLength)}). Maximum : ${formatBytes(MAX_TIFF_SOURCE_BYTES)}.`,
    };
  }
  try {
    const metadata = await sharp(buffer).metadata();
    if (metadata.format !== "tiff") {
      return { error: "Ce fichier n'est pas un TIFF valide" };
    }
    return { png: await sharp(buffer).png().toBuffer() };
  } catch {
    return { error: "Impossible de lire ce fichier TIFF" };
  }
}
