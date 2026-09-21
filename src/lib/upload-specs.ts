import type { AssetType } from "@/types";

// Source de vérité des contraintes d'upload, partagée entre le client
// (validation immédiate dans le dialog) et le serveur (garantie finale).

// Le poids source importe peu : sharp redimensionne + réencode systématiquement
// (cf. assets/route.ts), donc le fichier réellement sauvegardé est toujours
// optimisé quel que soit le poids uploadé. Cette limite n'existe que pour
// rester sous le plafond de la requête (proxyClientMaxBodySize, next.config.ts)
// une fois le fichier encodé en base64 (+33% de poids environ).
export const MAX_SOURCE_BYTES = 40 * 1024 * 1024; // 40 Mo

// Filet de sécurité pour les types sans dimensions cibles (outputFormat
// "source" : "other", "carousel_title") : pas de crop imposé, mais on limite
// quand même le plus grand côté pour éviter qu'une photo à pleine résolution
// (ex: 6000x4000) parte telle quelle sur le CMS. Ne réduit jamais une image
// déjà plus petite (withoutEnlargement).
export const MAX_SOURCE_DIMENSION = 2400;

// SVG à part : accepté uniquement par les specs qui le déclarent (allowSvg),
// et jamais passé dans sharp, qui le rasteriserait — c'est précisément le
// vectoriel qu'on veut conserver pour un logo.
export const SVG_MIME_TYPE = "image/svg+xml";

export function looksLikeSvg(file: { type: string; name?: string }): boolean {
  return file.type === SVG_MIME_TYPE || /\.svg$/i.test(file.name ?? "");
}

export const ACCEPTED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif", "image/tiff"];
// Windows ne rapporte pas toujours le type MIME des .tif/.tiff/.avif (file.type
// peut être vide) : on ajoute l'extension, comme pour le .mp4 plus bas.
export const ACCEPTED_MIME_ATTR = `${ACCEPTED_MIME_TYPES.join(",")},.tif,.tiff,.avif`;
export const ACCEPTED_FORMATS_LABEL = "JPEG, PNG, WebP, AVIF ou TIFF";

// Formats tels que rapportés par sharp().metadata().format. L'AVIF y apparaît
// sous « heif », le conteneur qu'il partage avec le HEIC (refusé en amont).
export const ACCEPTED_SHARP_FORMATS = ["jpeg", "png", "webp", "heif", "tiff"];

// Même souci que looksLikeMp4 plus bas : ne pas se fier uniquement à file.type.
export function looksLikeTiff(file: { type: string; name?: string }): boolean {
  return file.type === "image/tiff" || /\.tiff?$/i.test(file.name ?? "");
}

// Un TIFF source (scan/appareil pro, souvent peu ou pas compressé) peut être
// bien plus lourd qu'un JPEG/PNG équivalent — plafond dédié, volontairement
// haut ("quasi pas de limite" demandé). Reste borné pour éviter qu'un fichier
// vraiment pathologique ne fasse exploser la mémoire du serveur (sharp/JSON).
// ponytail: plafond arbitraire à 1 Go, à remonter si un vrai cas dépasse.
export const MAX_TIFF_SOURCE_BYTES = 1024 * 1024 * 1024; // 1 Go

// Vidéo (carte focus MEA v2) : pas de passage par sharp, pipeline dédiée.
export const MAX_VIDEO_SOURCE_BYTES = 40 * 1024 * 1024; // 40 Mo
export const ACCEPTED_VIDEO_MIME_TYPES = ["video/mp4"];
// Windows ne reconnaît pas toujours le type MIME des .mp4 (file.type peut
// être vide) : on ajoute l'extension pour que le sélecteur de fichier OS
// n'exclue pas les .mp4 dans ce cas.
export const ACCEPTED_VIDEO_MIME_ATTR = `${ACCEPTED_VIDEO_MIME_TYPES.join(",")},.mp4`;
export const ACCEPTED_VIDEO_FORMATS_LABEL = "MP4";

// Même souci que ci-dessus : ne pas se fier uniquement à file.type.
export function looksLikeMp4(file: { type: string; name?: string }): boolean {
  return file.type === "video/mp4" || /\.mp4$/i.test(file.name ?? "");
}

export interface AssetSpec {
  displayName: string;
  // Dimensions de sortie imposées. Absentes pour "other" (dimensions libres).
  targetWidth?: number;
  targetHeight?: number;
  // Recadrage imposé. Absent = upload libre : pas de crop, dimensions conservées
  cropShape?: "round" | "rect";
  cropAspect?: number;
  // "source" = format d'origine conservé, poids optimisé (sans redimensionnement)
  outputFormat: "png" | "jpeg" | "source";
  requireLabel: boolean;
  // "video" = pipeline dédiée (pas de sharp, pas de crop/dimensions). Défaut "image".
  kind?: "image" | "video";
  // Accepte aussi le SVG, stocké tel quel (logo marque). Réservé aux types
  // sans recadrage ni dimensions imposées : un vectoriel n'a rien à y gagner.
  allowSvg?: boolean;
}

export const ASSET_SPECS: Record<AssetType, AssetSpec> = {
  macaron: {
    displayName: "Macaron",
    targetWidth: 200,
    targetHeight: 200,
    cropShape: "round",
    cropAspect: 1,
    outputFormat: "png",
    requireLabel: false,
  },
  mea: {
    displayName: "MEA",
    targetWidth: 600,
    targetHeight: 400,
    cropShape: "rect",
    cropAspect: 3 / 2,
    outputFormat: "jpeg",
    requireLabel: true,
  },
  other: {
    displayName: "Autre",
    // Upload libre : image envoyée telle quelle, dimensions et format conservés
    outputFormat: "source",
    requireLabel: false,
  },
  macaron_v2: {
    displayName: "Macaron v2",
    targetWidth: 200,
    targetHeight: 300,
    cropShape: "rect",
    cropAspect: 200 / 300,
    outputFormat: "jpeg",
    requireLabel: false,
  },
  mea_v2: {
    displayName: "MEA v2",
    targetWidth: 1000,
    targetHeight: 600,
    cropShape: "rect",
    cropAspect: 1000 / 600,
    outputFormat: "jpeg",
    requireLabel: true,
  },
  mea_v2_focus: {
    displayName: "MEA v2 - Carte focus",
    targetWidth: 600,
    targetHeight: 700,
    cropShape: "rect",
    cropAspect: 600 / 700,
    outputFormat: "jpeg",
    requireLabel: true,
  },
  mea_v2_video: {
    displayName: "MEA v2 - Vidéo",
    outputFormat: "source",
    requireLabel: false,
    kind: "video",
  },
  // Clé historique « mea_v2_logo » conservée (les assets déjà en base la
  // portent), mais le type sert désormais aussi au logo du slider.
  mea_v2_logo: {
    displayName: "Logo marque",
    // Upload libre : un logo a ses propres proportions, jamais recadré, et le
    // format d'origine est conservé pour garder la transparence du PNG.
    outputFormat: "source",
    requireLabel: false,
    allowSvg: true,
  },
  edito: {
    displayName: "Edito",
    targetWidth: 300,
    targetHeight: 250,
    cropShape: "rect",
    cropAspect: 300 / 250,
    outputFormat: "jpeg",
    requireLabel: false,
  },
  carousel: {
    displayName: "Slider - Fond",
    targetWidth: 1920,
    targetHeight: 1080,
    cropShape: "rect",
    cropAspect: 1920 / 1080,
    outputFormat: "jpeg",
    requireLabel: false,
  },
  carousel_title: {
    displayName: "Slider - Titre image",
    // Upload libre (comme "other") : le titre est un visuel stylisé
    // (object-fit: contain côté CMS), pas de recadrage forcé.
    outputFormat: "source",
    requireLabel: false,
  },
  carousel_video: {
    displayName: "Slider - Vidéo",
    outputFormat: "source",
    requireLabel: false,
    kind: "video",
  },
  img_sous_menu: {
    displayName: "Img sous menu",
    targetWidth: 563,
    targetHeight: 125,
    cropShape: "rect",
    cropAspect: 563 / 125,
    outputFormat: "jpeg",
    requireLabel: false,
  },
  cat_banner_desktop: {
    displayName: "Cat banner - Desktop",
    // Upload libre : aucune dimension imposée ("on touche rien"), export en
    // jpg uniquement (poids optimisé via le pipeline sharp existant).
    outputFormat: "jpeg",
    requireLabel: false,
  },
  cat_banner_mobile: {
    displayName: "Cat banner - Mobile",
    outputFormat: "jpeg",
    requireLabel: false,
  },
  miniature_offre: {
    displayName: "Miniature offre",
    targetWidth: 301,
    targetHeight: 301,
    cropShape: "rect",
    cropAspect: 1,
    outputFormat: "jpeg",
    requireLabel: false,
  },
  moodboard: {
    displayName: "Moodboard",
    // Upload libre : l'élément image se redimensionne librement sur le
    // canevas, aucun recadrage à imposer à l'upload.
    outputFormat: "source",
    requireLabel: false,
  },
};

const KNOWN_ASSET_TYPES: AssetType[] = [
  "macaron",
  "mea",
  "macaron_v2",
  "mea_v2",
  "mea_v2_focus",
  "mea_v2_video",
  "mea_v2_logo",
  "edito",
  "carousel",
  "carousel_title",
  "carousel_video",
  "img_sous_menu",
  "cat_banner_desktop",
  "cat_banner_mobile",
  "miniature_offre",
  "moodboard",
];

export function resolveAssetType(type: unknown): AssetType {
  return KNOWN_ASSET_TYPES.includes(type as AssetType)
    ? (type as AssetType)
    : "other";
}

/**
 * Retire d'un SVG ce qui peut s'exécuter. Un logo n'a jamais besoin de script,
 * et le fichier finit servi tel quel (ici comme sur le CMS) : sans ce nettoyage
 * on accepterait du code arbitraire dans un fichier déposé par l'utilisateur.
 */
export function sanitizeSvg(svg: string): string {
  return svg
    .replace(/<script[\s\S]*?<\/script\s*>/gi, "")
    .replace(/<script[^>]*\/>/gi, "")
    .replace(/<foreignObject[\s\S]*?<\/foreignObject\s*>/gi, "")
    // Gestionnaires inline (onload, onclick...), guillemets simples ou doubles.
    .replace(/\son[a-z]+\s*=\s*"[^"]*"/gi, "")
    .replace(/\son[a-z]+\s*=\s*'[^']*'/gi, "")
    .replace(/javascript:/gi, "");
}

export function looksLikeSvgBuffer(buffer: Buffer): boolean {
  return /<svg[\s>]/i.test(buffer.subarray(0, 1024).toString("utf-8"));
}

export function normalizeAssetLabel(label: string): string {
  return label.replace(/\s+/g, " ").trim();
}

export function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
  return `${Math.round(bytes / 1024)} Ko`;
}

export function validateSourceFile(
  file: { type: string; size: number; name?: string },
  allowSvg = false,
): string | null {
  if (looksLikeSvg(file)) {
    if (!allowSvg) {
      return "Le SVG n'est accepté que pour le logo marque — utilisez un PNG pour ce type d'image.";
    }
  } else if (
    !ACCEPTED_MIME_TYPES.includes(file.type) &&
    !looksLikeTiff(file) &&
    !/\.avif$/i.test(file.name ?? "")
  ) {
    return `Format non supporté${file.type ? ` (${file.type})` : ""}. Formats acceptés : ${ACCEPTED_FORMATS_LABEL}.`;
  }
  const maxBytes = looksLikeTiff(file) ? MAX_TIFF_SOURCE_BYTES : MAX_SOURCE_BYTES;
  if (file.size > maxBytes) {
    return `Fichier trop lourd (${formatBytes(file.size)}). Maximum : ${formatBytes(maxBytes)}.`;
  }
  return null;
}

export function validateSourceVideoFile(file: {
  type: string;
  size: number;
  name?: string;
}): string | null {
  if (!looksLikeMp4(file)) {
    return `Format non supporté${file.type ? ` (${file.type})` : ""}. Formats acceptés : ${ACCEPTED_VIDEO_FORMATS_LABEL}.`;
  }
  if (file.size > MAX_VIDEO_SOURCE_BYTES) {
    return `Fichier trop lourd (${formatBytes(file.size)}). Maximum : ${formatBytes(MAX_VIDEO_SOURCE_BYTES)}.`;
  }
  return null;
}

