import type { EditoContent } from "@/types";
import { withPosition, type ImageEntry } from "@/lib/section-images";

// Pas de toggle "visible" sur les cartes edito : la position compte toutes
// les cartes, dans l'ordre.
export function getEditoImages(content: EditoContent): ImageEntry[] {
  return withPosition(content?.items ?? [])
    .filter(({ item }) => item.imageUrl)
    .map(({ item, position }) => ({
      imageUrl: item.imageUrl,
      imageWeek: item.imageWeek,
      baseName: `edito-${item.exportPosition ?? position}`,
      width: 300,
      height: 250,
    }));
}
