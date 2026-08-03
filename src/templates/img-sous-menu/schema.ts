import type { ImgSousMenuItem, ImgSousMenuContent } from "@/types";
import { v4 as uuidv4 } from "uuid";

export function createEmptyImgSousMenuItem(id: string): ImgSousMenuItem {
  return {
    id,
    label: "",
    imageUrl: "",
    imageId: uuidv4().slice(0, 8),
    imageWeek: null,
    exportPosition: null,
    linkType: "cgid",
    cgid: "",
    cid: "",
    link: "",
  };
}

export function createEmptyImgSousMenuContent(): ImgSousMenuContent {
  return { items: [] };
}

export function validateImgSousMenuContent(items: ImgSousMenuItem[]): string[] {
  const errors: string[] = [];
  items.forEach((item, i) => {
    if (!item.imageUrl) errors.push(`Img sous menu ${i + 1}: Image requise`);
  });
  return errors;
}
