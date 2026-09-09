import type { MiniatureOffreContent } from "@/types";
import { withPosition, type ImageEntry } from "@/lib/section-images";

export function getMiniatureOffreImages(content: MiniatureOffreContent): ImageEntry[] {
  return withPosition(content?.items ?? [])
    .filter(({ item }) => item.imageUrl)
    .map(({ item, position }) => ({
      imageUrl: item.imageUrl,
      imageWeek: item.imageWeek,
      baseName: `miniature-offre-${item.exportPosition ?? position}`,
      width: 301,
      height: 301,
      jpgOnly: true,
    }));
}
