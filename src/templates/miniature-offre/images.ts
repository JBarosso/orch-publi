import type { MiniatureOffreContent } from "@/types";
import { withPosition, type ImageEntry } from "@/lib/section-images";

// Le label est repris tel quel comme nom de fichier (espaces et majuscules
// compris) : c'est lui qui identifie l'offre côté CMS. Seuls les "/" et "\"
// sont remplacés — ils créeraient des dossiers au lieu d'un nom de fichier.
function fileNameFor(label: string | undefined, fallback: string): string {
  return (label ?? "").trim().replace(/[/\\]/g, "-") || fallback;
}

export function getMiniatureOffreImages(content: MiniatureOffreContent): ImageEntry[] {
  return withPosition(content?.items ?? [])
    .filter(({ item }) => item.imageUrl)
    .map(({ item, position }) => ({
      imageUrl: item.imageUrl,
      imageWeek: item.imageWeek,
      baseName: fileNameFor(item.label, `miniature-offre-${item.exportPosition ?? position}`),
      width: 301,
      height: 301,
      jpgOnly: true,
    }));
}
