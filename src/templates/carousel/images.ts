import type { CarouselContent } from "@/types";
import type { ImageEntry } from "@/lib/section-images";
import { usesUploadedBrandLogo } from "@/lib/brand-logo";

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
    // La vidéo n'est pas dans le ZIP : elle n'est plus hébergée ici, seule son
    // adresse est conservée et l'intégrateur la dépose lui-même dans le CMS
    // (cf. la liste « Vidéos à récupérer » de la page Export).
    if (slide.titleType === "image" && slide.titleImageUrl) {
      entries.push({
        imageUrl: slide.titleImageUrl,
        imageWeek: slide.titleImageWeek,
        baseName: `carousel-${slot}-title`,
        width: null,
        height: null,
      });
    }
    // Logo marque uploadé : même semaine que le visuel de la slide, en PNG non
    // redimensionné (ou SVG tel quel) pour garder transparence et proportions.
    // Doit matcher brandLogoExportSrc côté HTML (cf. export.ts).
    const callout = slide.productCallout;
    if (callout?.enabled && callout.showBrandLogo && usesUploadedBrandLogo(callout)) {
      entries.push({
        imageUrl: callout.brandLogoUrl as string,
        imageWeek: slide.imageWeek,
        baseName: `carousel-${slot}-logo`,
        width: null,
        height: null,
        vectorOrPng: true,
      });
    }
  });
  return entries;
}
