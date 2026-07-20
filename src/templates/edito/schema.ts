import type { EditoCard, EditoContent } from "@/types";
import { v4 as uuidv4 } from "uuid";
import { createEmptyButton } from "@/templates/mea/schema";

export function createEmptyEditoCard(id: string): EditoCard {
  return {
    id,
    comment: "",
    theme: "aqua",
    title: "",
    text: "",
    imageUrl: "",
    imageId: uuidv4().slice(0, 8),
    imageWeek: null,
    exportPosition: null,
    linkType: "cgid",
    cgid: "",
    cid: "",
    link: "",
    buttons: [createEmptyButton()],
  };
}

export function createEmptyEditoContent(): EditoContent {
  return { items: [] };
}

export function validateEditoContent(items: EditoCard[]): string[] {
  const errors: string[] = [];
  items.forEach((item, i) => {
    if (!item.title.trim()) errors.push(`Edito ${i + 1}: Titre requis`);
    if (!item.imageUrl) errors.push(`Edito ${i + 1}: Image requise`);
  });
  return errors;
}
