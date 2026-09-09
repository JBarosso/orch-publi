import type { ImgSousMenuContent } from "@/types";
import { withPosition, type ImageEntry } from "@/lib/section-images";

export function getImgSousMenuImages(content: ImgSousMenuContent): ImageEntry[] {
  return withPosition(content?.items ?? [])
    .filter(({ item }) => item.imageUrl)
    .map(({ item, position }) => ({
      imageUrl: item.imageUrl,
      imageWeek: item.imageWeek,
      baseName: `img-sous-menu-${item.exportPosition ?? position}`,
      width: 563,
      height: 125,
    }));
}
