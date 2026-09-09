import type { CatBannerContent } from "@/types";
import type { ImageEntry } from "@/lib/section-images";
import { slugify } from "./schema";

// Nommage par slug du label (et non par position) : deux fichiers par
// bannière, desktop et mobile, dans la racine "banner" au lieu de "homepage".
export function getCatBannerImages(content: CatBannerContent): ImageEntry[] {
  const entries: ImageEntry[] = [];
  (content?.items ?? []).forEach((item) => {
    const slug = slugify(item.label);
    if (item.desktopImageUrl) {
      entries.push({
        imageUrl: item.desktopImageUrl,
        imageWeek: item.imageWeek,
        baseName: `banner-desktop-${slug}`,
        width: null,
        height: null,
        folder: "banner",
        jpgOnly: true,
      });
    }
    if (item.mobileImageUrl) {
      entries.push({
        imageUrl: item.mobileImageUrl,
        imageWeek: item.imageWeek,
        baseName: `banner-mobile-${slug}`,
        width: null,
        height: null,
        folder: "banner",
        jpgOnly: true,
      });
    }
  });
  return entries;
}
