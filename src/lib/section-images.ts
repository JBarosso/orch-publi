import type {
  CarouselContent,
  CatBannerContent,
  CustomContent,
  EditoContent,
  ImgSousMenuContent,
  MacaronsContent,
  MeaContent,
  MeaV2Content,
  MiniatureOffreContent,
} from "@/types";
import { slugify } from "@/templates/cat-banner/schema";
import { resolveCustomFolder, resolveImageBaseName } from "@/lib/cms-image-path";

export interface ImageEntry {
  imageUrl: string;
  imageWeek: number | null;
  baseName: string;
  // null = dimensions libres (sections personnalisées) : pas de resize forcé
  width: number | null;
  height: number | null;
  // Vidéo (carte focus MEA v2, slide carousel) : copiée telle quelle dans le zip, pas de sharp
  isVideo?: boolean;
  // Racine du chemin CMS — "homepage" par défaut si absent (cf. build-zip.ts)
  folder?: string;
  // N'exporte que le .jpg, pas de variante .webp (cat-banner : pas de <picture>)
  jpgOnly?: boolean;
  // Image "globale" (quickaccess v2, MEA v2) : omet le segment locale dans le
  // chemin CMS du zip (doit matcher buildCmsImagePath côté export HTML).
  noLocale?: boolean;
  // Chemin personnalisé (quickaccess v2, MEA v2) remplaçant
  // "{folder}/{année}/wk{semaine}" — doit matcher resolveCmsFolder côté
  // export HTML. Absent = chemin par défaut.
  customFolder?: string;
}

// Fige la position AVANT de retirer les items sans image, pour qu'elle
// corresponde à l'ordre réel dans le template (celui utilisé par le HTML
// généré), pas à l'ordre parmi les seuls items déjà renseignés — sinon le
// nom de fichier exporté ne correspond plus à la position affichée dès qu'un
// item sans image précède un item rempli.
function withPosition<T>(items: T[]): { item: T; position: number }[] {
  return items.map((item, index) => ({ item, position: index + 1 }));
}

function getMacaronImages(content: MacaronsContent): ImageEntry[] {
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

function getMeaImages(content: MeaContent): ImageEntry[] {
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

function getEditoImages(content: EditoContent): ImageEntry[] {
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

function getImgSousMenuImages(content: ImgSousMenuContent): ImageEntry[] {
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

function getCatBannerImages(content: CatBannerContent): ImageEntry[] {
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

function getMiniatureOffreImages(content: MiniatureOffreContent): ImageEntry[] {
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
  const sectionPath = content?.customPath;
  return withPosition((content?.items ?? []).filter((i) => i.visible))
    .filter(({ item }) => item.imageUrl)
    .map(({ item, position }) => ({
      imageUrl: item.imageUrl,
      imageWeek: item.imageWeek,
      baseName: resolveImageBaseName(item, `quickaccess-${item.exportPosition ?? position}`),
      width: 200,
      height: 300,
      noLocale: item.isGlobalImage,
      customFolder: resolveCustomFolder(item, sectionPath) || undefined,
    }));
}

function getMeaV2Images(content: MeaV2Content): ImageEntry[] {
  const sectionPath = content?.customPath;
  const entries: ImageEntry[] = withPosition(content?.cards ?? [])
    .filter(({ item }) => item.imageUrl)
    .map(({ item: card, position }) => ({
      imageUrl: card.imageUrl,
      imageWeek: card.imageWeek,
      baseName: resolveImageBaseName(card, `mea-${position}`),
      width: 1000,
      height: 600,
      noLocale: card.isGlobalImage,
      customFolder: resolveCustomFolder(card, sectionPath) || undefined,
    }));

  const focus = content?.focus;
  const focusFolder = focus ? resolveCustomFolder(focus, sectionPath) || undefined : undefined;
  if (focus?.imageUrl) {
    // Vignette (poster) : toujours exportée en image, même en mode vidéo
    entries.push({
      imageUrl: focus.imageUrl,
      imageWeek: focus.imageWeek,
      baseName: resolveImageBaseName(focus, "mea-5"),
      width: 600,
      height: 700,
      noLocale: focus.isGlobalImage,
      customFolder: focusFolder,
    });
  }
  if (focus?.mediaType === "video" && focus.videoUrl) {
    entries.push({
      imageUrl: focus.videoUrl,
      imageWeek: focus.imageWeek,
      baseName: resolveImageBaseName(focus, "mea-5"),
      width: null,
      height: null,
      noLocale: focus.isGlobalImage,
      customFolder: focusFolder,
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
  if (type === "img_sous_menu") return getImgSousMenuImages(content as ImgSousMenuContent);
  if (type === "cat_banner") return getCatBannerImages(content as CatBannerContent);
  if (type === "miniature_offre") return getMiniatureOffreImages(content as MiniatureOffreContent);
  return [];
}
