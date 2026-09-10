import { NextRequest, NextResponse } from "next/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { MAX_TIFF_SOURCE_BYTES } from "@/lib/upload-specs";
import { TEMP_UPLOAD_PREFIX } from "@/lib/storage";

// Jeton d'upload direct navigateur → Vercel Blob (cf. src/lib/storage.ts).
// Volontairement sans onUploadCompleted : Vercel rappellerait alors cette
// route sans cookie de session, et src/proxy.ts le renverrait vers /login.
// Ce sont les routes qui reçoivent l'URL du fichier qui font le travail.
export async function POST(request: NextRequest) {
  // Sans Blob (dev local sur disque), le navigateur envoie le fichier à la route.
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json({ error: "Upload direct indisponible" }, { status: 501 });
  }

  try {
    const body = (await request.json()) as HandleUploadBody;
    const result = await handleUpload({
      request,
      body,
      onBeforeGenerateToken: async (pathname) => {
        if (!pathname.startsWith(TEMP_UPLOAD_PREFIX) || pathname.includes("..")) {
          throw new Error("Upload direct autorisé uniquement sous tmp/");
        }
        // Plafond le plus haut (TIFF) : chaque route revérifie selon le type d'asset.
        return { addRandomSuffix: true, maximumSizeInBytes: MAX_TIFF_SOURCE_BYTES };
      },
    });
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Upload direct refusé" },
      { status: 400 },
    );
  }
}
