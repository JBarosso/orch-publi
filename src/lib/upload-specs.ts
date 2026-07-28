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

export const ACCEPTED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/tiff"];
// Windows ne rapporte pas toujours le type MIME des .tif/.tiff (file.type
// peut être vide) : on ajoute l'extension, comme pour le .mp4 plus bas.
export const ACCEPTED_MIME_ATTR = `${ACCEPTED_MIME_TYPES.join(",")},.tif,.tiff`;
export const ACCEPTED_FORMATS_LABEL = "JPEG, PNG, WebP ou TIFF";

// Formats tels que rapportés par sharp().metadata().format
export const ACCEPTED_SHARP_FORMATS = ["jpeg", "png", "webp", "tiff"];

// Même souci que looksLikeMp4 plus bas : ne pas se fier uniquement à file.type.
export function looksLikeTiff(file: { type: string; name?: string }): boolean {
  return file.type === "image/tiff" || /\.tiff?$/i.test(file.name ?? "");
}

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
};

const KNOWN_ASSET_TYPES: AssetType[] = [
  "macaron",
  "mea",
  "macaron_v2",
  "mea_v2",
  "mea_v2_focus",
  "mea_v2_video",
  "edito",
  "carousel",
  "carousel_title",
  "carousel_video",
];

export function resolveAssetType(type: unknown): AssetType {
  return KNOWN_ASSET_TYPES.includes(type as AssetType)
    ? (type as AssetType)
    : "other";
}

export function normalizeAssetLabel(label: string): string {
  return label.replace(/\s+/g, " ").trim();
}

export function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
  return `${Math.round(bytes / 1024)} Ko`;
}

export function validateSourceFile(file: {
  type: string;
  size: number;
  name?: string;
}): string | null {
  if (!ACCEPTED_MIME_TYPES.includes(file.type) && !looksLikeTiff(file)) {
    return `Format non supporté${file.type ? ` (${file.type})` : ""}. Formats acceptés : ${ACCEPTED_FORMATS_LABEL}.`;
  }
  if (file.size > MAX_SOURCE_BYTES) {
    return `Fichier trop lourd (${formatBytes(file.size)}). Maximum : ${formatBytes(MAX_SOURCE_BYTES)}.`;
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

