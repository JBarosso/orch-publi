import type { MacaronItem } from "@/types";
import { v4 as uuidv4 } from "uuid";

export function createEmptyMacaron(id: string): MacaronItem {
  return {
    id,
    label: "",
    comment: "",
    linkType: "cgid",
    cgid: "",
    cid: "",
    link: "",
    imageUrl: "",
    imageId: uuidv4().slice(0, 8),
    imageWeek: null,
    exportPosition: null,
    visible: true,
  };
}

export function validateMacaronsContent(items: MacaronItem[]): string[] {
  const errors: string[] = [];
  items.forEach((item, i) => {
    if (!item.label.replace(/\n/g, "").trim()) errors.push(`Macaron ${i + 1}: label requis`);
  });
  return errors;
}
