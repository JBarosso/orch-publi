import type { MeaContent } from "@/types";
import { withPosition, type ImageEntry } from "@/lib/section-images";

export function getMeaImages(content: MeaContent): ImageEntry[] {
  return withPosition((content?.items ?? []).filter((i) => i.visible))
    .filter(({ item }) => item.imageUrl)
    .map(({ item, position }) => ({
      imageUrl: item.imageUrl,
      imageWeek: item.imageWeek,
      baseName: `mea-${item.exportPosition ?? position}`,
      width: 600,
      height: 400,
    }));
}
