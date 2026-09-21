import { upload } from "@vercel/blob/client";
import type { AssetType } from "@/types";

// Envoi d'un fichier vers la médiathèque, partagé par la fenêtre d'upload et
// le collage d'une capture dans le moodboard.

// Upload direct navigateur → Vercel Blob, sous tmp/ (cf. src/lib/storage.ts).
// Sur Vercel, une route refuse tout corps de requête au-delà de 4,5 Mo
// (erreur 413) : c'est ce qui bloquait les TIFF, les vidéos et les images
// lourdes. Renvoie null si l'upload direct est indisponible (dev local sans
// Blob) : l'appelant envoie alors le fichier à la route, comme avant.
export async function uploadToTemp(body: Blob, contentType: string): Promise<string | null> {
  try {
    const blob = await upload("tmp/upload", body, {
      access: "public",
      handleUploadUrl: "/api/assets/blob-token",
      contentType,
      // Envoi en parties parallèles avec reprise, pour les gros TIFF.
      multipart: body.size > 100 * 1024 * 1024,
    });
    return blob.url;
  } catch (err) {
    console.warn("Upload direct indisponible, envoi par la route :", err);
    return null;
  }
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

export interface AssetFields {
  label: string;
  week: number | null;
  year: number | null;
  type: AssetType;
  fromTiff?: boolean;
}

/**
 * Crée l'asset et renvoie la réponse brute de /api/assets : l'appelant garde
 * la main sur l'affichage de l'erreur. Seule l'URL du fichier transite par la
 * route quand l'upload direct est disponible, quel que soit son poids.
 */
export async function postAsset(file: Blob, fields: AssetFields): Promise<Response> {
  const sourceUrl = await uploadToTemp(file, file.type);
  return fetch("/api/assets", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...(sourceUrl ? { sourceUrl } : { image: await blobToDataUrl(file) }),
      ...fields,
    }),
  });
}
