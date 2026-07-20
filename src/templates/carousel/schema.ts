import type { CarouselButton, CarouselContent, CarouselProductCallout, CarouselSlide } from "@/types";
import { v4 as uuidv4 } from "uuid";

export function createEmptyCarouselButton(): CarouselButton {
  return { text: "", linkType: "cgid", cgid: "", cid: "", link: "" };
}

export function createEmptyProductCallout(): CarouselProductCallout {
  return {
    enabled: false,
    side: "left",
    showBrandLogo: false,
    brandLogoPath: "svg/premaman.svg",
    label: "",
    publicPrice: "",
    clubPrice: "",
    showClubIcon: true,
    showPromoBadge: false,
    promoBadgeText: "Promo Club*",
  };
}

export function createEmptyCarouselSlide(id: string): CarouselSlide {
  return {
    id,
    comment: "",
    mediaType: "image",
    imageUrl: "",
    imageId: uuidv4().slice(0, 8),
    imageWeek: null,
    videoUrl: "",
    videoId: uuidv4().slice(0, 8),
    darkOverlay: false,
    titleType: "text",
    titleText: "",
    titleImageUrl: "",
    titleImageId: uuidv4().slice(0, 8),
    titleImageWeek: null,
    productCallout: createEmptyProductCallout(),
    buttons: [createEmptyCarouselButton()],
    linkType: "cgid",
    cgid: "",
    cid: "",
    link: "",
  };
}

export function createEmptyCarouselContent(): CarouselContent {
  return { slides: [createEmptyCarouselSlide(uuidv4()), createEmptyCarouselSlide(uuidv4())] };
}

export function validateCarouselContent(content: CarouselContent): string[] {
  const errors: string[] = [];
  (content.slides ?? []).forEach((slide, i) => {
    if (slide.mediaType === "image" && !slide.imageUrl) {
      errors.push(`Carousel diapo ${i + 1}: Image de fond requise`);
    }
    if (slide.mediaType === "video" && !slide.videoUrl) {
      errors.push(`Carousel diapo ${i + 1}: Vidéo requise`);
    }
    if (slide.titleType === "text" && !slide.titleText.trim()) {
      errors.push(`Carousel diapo ${i + 1}: Titre requis`);
    }
    if (slide.titleType === "image" && !slide.titleImageUrl) {
      errors.push(`Carousel diapo ${i + 1}: Image de titre requise`);
    }
  });
  return errors;
}
