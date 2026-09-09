import type { MacaronsContent } from "@/types";
import { withPosition, type ImageEntry } from "@/lib/section-images";

export function getMacaronImages(content: MacaronsContent): ImageEntry[] {
  return withPosition((content?.items ?? []).filter((i) => i.visible))
    .filter(({ item }) => item.imageUrl)
    .map(({ item, position }) => ({
      imageUrl: item.imageUrl,
      imageWeek: item.imageWeek,
      baseName: `quickaccess-${item.exportPosition ?? position}`,
      width: 70,
      height: 70,
    }));
}
