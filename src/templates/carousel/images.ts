import type { CarouselContent } from "@/types";
import type { ImageEntry } from "@/lib/section-images";

// Diapositives à emplacement fixe : la position vient de l'index brut, et
// chaque slide peut produire jusqu'à trois fichiers (fond, vidéo, titre image).
export function getCarouselImages(content: CarouselContent): ImageEntry[] {
  const entries: ImageEntry[] = [];
  (content?.slides ?? []).forEach((slide, index) => {
    const slot = index + 1;
    if (slide.imageUrl) {
      // Fond (ou vignette si vidéo) : toujours exporté en image
      entries.push({
        imageUrl: slide.imageUrl,
        imageWeek: slide.imageWeek,
        baseName: `carousel-${slot}`,
        width: 1920,
        height: 1080,
      });
    }
    if (slide.mediaType === "video" && slide.videoUrl) {
      entries.push({
        imageUrl: slide.videoUrl,
        imageWeek: slide.imageWeek,
        baseName: `carousel-${slot}`,
        width: null,
        height: null,
        isVideo: true,
      });
    }
    if (slide.titleType === "image" && slide.titleImageUrl) {
      entries.push({
        imageUrl: slide.titleImageUrl,
        imageWeek: slide.titleImageWeek,
        baseName: `carousel-${slot}-title`,
        width: null,
        height: null,
      });
    }
  });
  return entries;
}
