import type { MacaronItem } from "@/types";
import { v4 as uuidv4 } from "uuid";

export function validateMacaronLabel(label: string): string | null {
  return null;
}

export function sanitizeMacaronLabel(label: string): string {
  return label;
}

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
    visible: true,
  };
}

export function validateMacaronsContent(items: MacaronItem[]): string[] {
  const errors: string[] = [];
  items.forEach((item, i) => {
    const labelErr = validateMacaronLabel(item.label);
    if (labelErr) errors.push(`Macaron ${i + 1}: ${labelErr}`);
    if (!item.label.replace(/\n/g, "").trim()) errors.push(`Macaron ${i + 1}: label requis`);
  });
  return errors;
}
