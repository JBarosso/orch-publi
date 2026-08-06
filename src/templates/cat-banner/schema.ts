import type { CatBannerItem, CatBannerContent } from "@/types";
import { v4 as uuidv4 } from "uuid";

// Base du nom de fichier exporté (ex: "Maxi Cosi" -> "maxi-cosi") : minuscules,
// accents retirés, tout ce qui n'est pas alphanumérique devient un tiret.
const DIACRITICS = /[̀-ͯ]/g;

export function slugify(str: string): string {
  return str
    .normalize("NFD")
    .replace(DIACRITICS, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function createEmptyCatBannerItem(id: string): CatBannerItem {
  return {
    id,
    label: "",
    url: "",
    desktopImageUrl: "",
    desktopImageId: uuidv4().slice(0, 8),
    mobileImageUrl: "",
    mobileImageId: uuidv4().slice(0, 8),
    imageWeek: null,
    exportPosition: null,
  };
}

export function createEmptyCatBannerContent(): CatBannerContent {
  return { items: [] };
}

export function validateCatBannerContent(items: CatBannerItem[]): string[] {
  const errors: string[] = [];
  items.forEach((item, i) => {
    if (!item.label.trim()) errors.push(`Cat banner ${i + 1}: label requis`);
    if (!item.desktopImageUrl) errors.push(`Cat banner ${i + 1}: image desktop requise`);
    if (!item.mobileImageUrl) errors.push(`Cat banner ${i + 1}: image mobile requise`);
  });
  return errors;
}
