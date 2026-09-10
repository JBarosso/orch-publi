import { NextRequest, NextResponse } from "next/server";
import { getSectionImages } from "@/templates/registry";
import { prepareZip, streamZip } from "@/lib/build-zip";
import type { ImageEntry } from "@/lib/section-images";
import { LOCALES } from "@/types";
import { isDemoImageUrl } from "../_demo/config";

// Export ZIP de la démo publique (exemptée du login, cf. src/proxy.ts). Pas de
// base : le navigateur envoie le contenu de ses sections, et on réutilise la
// chaîne de l'export réel (collecte d'images du template, sharp, ZIP en flux).
const DEMO_TYPES = new Set(["macarons_v2", "mea_v2"]);
// Route ouverte à tous : borne le travail de conversion demandé en une fois.
const MAX_IMAGES = 60;

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const year = Number(body?.year);
  const week = Number(body?.week);
  const locale = body?.locale;
  const sections: unknown[] = Array.isArray(body?.sections) ? body.sections : [];

  if (!Number.isInteger(year) || !Number.isInteger(week) || !LOCALES.some((l) => l.value === locale)) {
    return NextResponse.json({ error: "Brief invalide" }, { status: 400 });
  }

  let images: ImageEntry[];
  try {
    images = sections.flatMap((section) => {
      const { type, content } = (section ?? {}) as { type?: unknown; content?: unknown };
      return typeof type === "string" && DEMO_TYPES.has(type) ? getSectionImages(type, content) : [];
    });
  } catch {
    return NextResponse.json({ error: "Contenu de section invalide" }, { status: 400 });
  }

  if (images.length === 0) {
    return NextResponse.json({ error: "Aucun visuel à exporter" }, { status: 400 });
  }
  // Seuls les visuels de la galerie de démo sont convertis : sans ce contrôle,
  // n'importe qui ferait télécharger et traiter n'importe quelle URL au serveur.
  if (images.length > MAX_IMAGES || !images.every((image) => isDemoImageUrl(image.imageUrl))) {
    return NextResponse.json({ error: "Visuels non autorisés dans la démo" }, { status: 400 });
  }

  const prepared = await prepareZip([{ folderPrefix: "", images, year, week, locale }]);
  if (prepared.failed.length === images.length) {
    return NextResponse.json({ error: "Aucune image n'a pu être lue." }, { status: 502 });
  }

  const wk = String(week).padStart(2, "0");
  return new NextResponse(streamZip(prepared), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="homepage-${year}-wk${wk}-${locale}.zip"`,
      ...(prepared.failed.length > 0
        ? { "X-Export-Images-Manquantes": String(prepared.failed.length) }
        : {}),
    },
  });
}
