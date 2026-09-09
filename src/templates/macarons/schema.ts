import type { MacaronItem, MacaronsContent } from "@/types";
import { v4 as uuidv4 } from "uuid";
import { withItemDefaults } from "@/lib/normalize-content";

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
    isGlobalImage: false,
    globalFileName: "",
    useCustomPath: false,
    customPath: "",
  };
}

/**
 * Complète un contenu lu en base avec les champs ajoutés après coup
 * (isGlobalImage, globalFileName, useCustomPath, customPath...). Partagé par
 * macarons v1 et quickaccess v2, qui utilisent la même forme.
 */
export function normalizeMacaronsContent(content: unknown): MacaronsContent {
  const c = (content ?? {}) as Partial<MacaronsContent>;
  return {
    ...c,
    items: withItemDefaults(c.items, createEmptyMacaron),
  };
}

export function validateMacaronsContent(items: MacaronItem[]): string[] {
  const errors: string[] = [];
  items.forEach((item, i) => {
    if (!item.label.replace(/\n/g, "").trim()) errors.push(`Macaron ${i + 1}: label requis`);
  });
  return errors;
}
