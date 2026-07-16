import type { AssetType } from "@/types";

// Source de vérité des contraintes d'upload, partagée entre le client
// (validation immédiate dans le dialog) et le serveur (garantie finale).

export const MAX_SOURCE_BYTES = 15 * 1024 * 1024; // 15 Mo

export const ACCEPTED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];
export const ACCEPTED_MIME_ATTR = ACCEPTED_MIME_TYPES.join(",");
export const ACCEPTED_FORMATS_LABEL = "JPEG, PNG ou WebP";

// Formats tels que rapportés par sharp().metadata().format
export const ACCEPTED_SHARP_FORMATS = ["jpeg", "png", "webp"];

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
};

export function resolveAssetType(type: unknown): AssetType {
  return type === "macaron" || type === "mea" ? type : "other";
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
}): string | null {
  if (!ACCEPTED_MIME_TYPES.includes(file.type)) {
    return `Format non supporté${file.type ? ` (${file.type})` : ""}. Formats acceptés : ${ACCEPTED_FORMATS_LABEL}.`;
  }
  if (file.size > MAX_SOURCE_BYTES) {
    return `Fichier trop lourd (${formatBytes(file.size)}). Maximum : ${formatBytes(MAX_SOURCE_BYTES)}.`;
  }
  return null;
}

export function validateSourceDimensions(
  width: number,
  height: number,
  spec: AssetSpec,
): string | null {
  if (
    spec.targetWidth &&
    spec.targetHeight &&
    (width < spec.targetWidth || height < spec.targetHeight)
  ) {
    return `Image trop petite (${width}×${height} px). Minimum requis : ${spec.targetWidth}×${spec.targetHeight} px.`;
  }
  return null;
}
