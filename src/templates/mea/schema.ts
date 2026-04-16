import type { MeaItem } from "@/types";
import { v4 as uuidv4 } from "uuid";

export function createEmptyMea(id: string): MeaItem {
  return {
    id,
    visible: true,
    imageUrl: "",
    imageId: uuidv4().slice(0, 8),
    imageWeek: null,
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

export function validateMeaContent(items: MeaItem[]): string[] {
  const errors: string[] = [];
  items.forEach((item, i) => {
    if (!item.title.trim()) errors.push(`MEA ${i + 1}: Titre requis`);
    if (!item.imageUrl) errors.push(`MEA ${i + 1}: Image requise`);
  });
  return errors;
}
