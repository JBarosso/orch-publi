import type { MiniatureOffreItem, MiniatureOffreContent } from "@/types";
import { v4 as uuidv4 } from "uuid";

export function createEmptyMiniatureOffreItem(id: string): MiniatureOffreItem {
  return {
    id,
    label: "",
    imageUrl: "",
    imageId: uuidv4().slice(0, 8),
    imageWeek: null,
    exportPosition: null,
  };
}

export function createEmptyMiniatureOffreContent(): MiniatureOffreContent {
  return { items: [] };
}

export function validateMiniatureOffreContent(items: MiniatureOffreItem[]): string[] {
  const errors: string[] = [];
  items.forEach((item, i) => {
    if (!item.imageUrl) errors.push(`Miniature offre ${i + 1}: Image requise`);
  });
  return errors;
}
