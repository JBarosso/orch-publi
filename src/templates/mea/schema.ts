import type { MeaButton, MeaContent, MeaItem } from "@/types";
import { v4 as uuidv4 } from "uuid";
import { withDefaults, withItemDefaults } from "@/lib/normalize-content";

export function createEmptyMea(id: string): MeaItem {
  return {
    id,
    visible: true,
    imageUrl: "",
    imageId: uuidv4().slice(0, 8),
    imageWeek: null,
    exportPosition: null,
    comment: "",
    imageOpacity: 1,
    imagePosition: 50,
    showBrandLogo: false,
    brandLogoPath: "svg/premaman-blc.svg",
    overlayType: "none",
    overlayText: "",
    title: "",
    pricingMode: "standard",
    showPrePrice: true,
    prePriceText: "À partir de",
    initialPrice: "",
    customPriceText: "",
    clubPrice: "",
    showClubLabel: true,
    clubLabelText: "Promo*",
    showClubIcon: true,
    buttons: [createEmptyButton()],
  };
}

export function createEmptyButton() {
  return {
    text: "Découvrir",
    linkType: "cgid" as const,
    cgid: "",
    cid: "",
    link: "",
  };
}

/** Complète les boutons, dont les champs cid/link ont été ajoutés après coup. */
export function normalizeButtons(buttons: unknown): MeaButton[] {
  if (!Array.isArray(buttons) || buttons.length === 0) return [createEmptyButton()];
  return buttons.map((b) => withDefaults(createEmptyButton(), (b ?? {}) as Partial<MeaButton>));
}

export function normalizeMeaContent(content: unknown): MeaContent {
  const c = (content ?? {}) as Partial<MeaContent>;
  return {
    ...c,
    items: withItemDefaults(c.items, createEmptyMea, (item) => ({
      ...item,
      buttons: normalizeButtons(item.buttons),
    })),
  };
}

export function validateMeaContent(items: MeaItem[]): string[] {
  const errors: string[] = [];
  items.forEach((item, i) => {
    if (!item.title.trim()) errors.push(`MEA ${i + 1}: Titre requis`);
    if (!item.imageUrl) errors.push(`MEA ${i + 1}: Image requise`);
  });
  return errors;
}
