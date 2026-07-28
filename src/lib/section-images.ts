import type {
  CarouselContent,
  CustomContent,
  EditoContent,
  MacaronsContent,
  MeaContent,
  MeaV2Content,
} from "@/types";

export interface ImageEntry {
  imageUrl: string;
  imageWeek: number | null;
  baseName: string;
  // null = dimensions libres (sections personnalisées) : pas de resize forcé
  width: number | null;
  height: number | null;
  // Vidéo (carte focus MEA v2, slide carousel) : copiée telle quelle dans le zip, pas de sharp
  isVideo?: boolean;
}

function getMacaronImages(content: MacaronsContent): ImageEntry[] {
  return (content?.items ?? [])
    .filter((i) => i.visible && i.imageUrl)
    .map((item, index) => ({
      imageUrl: item.imageUrl,
      imageWeek: item.imageWeek,
      baseName: `quickaccess-${item.exportPosition ?? index + 1}`,
      width: 70,
      height: 70,
    }));
}

function getMeaImages(content: MeaContent): ImageEntry[] {
  return (content?.items ?? [])
    .filter((i) => i.visible && i.imageUrl)
    .map((item, index) => ({
      imageUrl: item.imageUrl,
      imageWeek: item.imageWeek,
      baseName: `mea-${item.exportPosition ?? index + 1}`,
      width: 600,
      height: 400,
    }));
}

function getEditoImages(content: EditoContent): ImageEntry[] {
  return (content?.items ?? [])
    .filter((i) => i.imageUrl)
    .map((item, index) => ({
      imageUrl: item.imageUrl,
      imageWeek: item.imageWeek,
      baseName: `edito-${item.exportPosition ?? index + 1}`,
      width: 300,
      height: 250,
    }));
}

function getCustomImages(content: CustomContent): ImageEntry[] {
  return (content?.blocks ?? [])
    .filter((b) => b.type === "image" && b.imageUrl)
    .map((block) => ({
      imageUrl: block.imageUrl,
      imageWeek: block.imageWeek,
      baseName: `custom-${block.imageId}`,
      width: null,
      height: null,
    }));
}

function getMacaronsV2Images(content: MacaronsContent): ImageEntry[] {
  return (content?.items ?? [])
    .filter((i) => i.visible && i.imageUrl)
    .map((item, index) => ({
      imageUrl: item.imageUrl,
      imageWeek: item.imageWeek,
      baseName: `quickaccess-${item.exportPosition ?? index + 1}`,
      width: 200,
      height: 300,
    }));
}

function getMeaV2Images(content: MeaV2Content): ImageEntry[] {
  const entries: ImageEntry[] = (content?.cards ?? [])
    .filter((c) => c.imageUrl)
    .map((card, index) => ({
      imageUrl: card.imageUrl,
      imageWeek: card.imageWeek,
      baseName: `mea-${index + 1}`,
      width: 1000,
      height: 600,
    }));

  const focus = content?.focus;
  if (focus?.imageUrl) {
    // Vignette (poster) : toujours exportée en image, même en mode vidéo
    entries.push({
      imageUrl: focus.imageUrl,
      imageWeek: focus.imageWeek,
      baseName: "mea-5",
      width: 600,
      height: 700,
    });
  }
  if (focus?.mediaType === "video" && focus.videoUrl) {
    entries.push({
      imageUrl: focus.videoUrl,
      imageWeek: focus.imageWeek,
      baseName: "mea-5",
      width: null,
      height: null,
      isVideo: true,
    });
  }

  return entries;
}

function getCarouselImages(content: CarouselContent): ImageEntry[] {
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

// Point d'entrée unique : ajouter un type d'asset ici suffit pour que l'export
// ZIP (simple, "tous les fichiers" et groupé) le prenne en compte partout.
export function getSectionImages(type: string, content: unknown): ImageEntry[] {
  if (type === "macarons") return getMacaronImages(content as MacaronsContent);
  if (type === "mea") return getMeaImages(content as MeaContent);
  if (type === "custom") return getCustomImages(content as CustomContent);
  if (type === "macarons_v2") return getMacaronsV2Images(content as MacaronsContent);
  if (type === "mea_v2") return getMeaV2Images(content as MeaV2Content);
  if (type === "edito") return getEditoImages(content as EditoContent);
  if (type === "carousel") return getCarouselImages(content as CarouselContent);
  return [];
}
