import type { MeaV2Card, MeaV2FocusCard, MeaV2Content } from "@/types";
import { v4 as uuidv4 } from "uuid";
import { createEmptyButton } from "../mea/schema";

export { createEmptyButton };

export function createEmptyMeaV2Card(id: string): MeaV2Card {
  return {
    id,
    comment: "",
    title: "",
    buttons: [createEmptyButton()],
    linkType: "cgid",
    cgid: "",
    cid: "",
    link: "",
    imageUrl: "",
    imageId: uuidv4().slice(0, 8),
    imageWeek: null,
  };
}

export function createEmptyMeaV2FocusCard(id: string): MeaV2FocusCard {
  return {
    ...createEmptyMeaV2Card(id),
    mediaType: "image",
    videoUrl: "",
    videoId: uuidv4().slice(0, 8),
    appelPrix: {
      enabled: false,
      title: "",
      initialPrice: "",
      clubPrice: "",
      showClubIcon: true,
    },
  };
}

export function createEmptyMeaV2Content(): MeaV2Content {
  return {
    cards: [
      createEmptyMeaV2Card(uuidv4()),
      createEmptyMeaV2Card(uuidv4()),
      createEmptyMeaV2Card(uuidv4()),
      createEmptyMeaV2Card(uuidv4()),
    ],
    focus: createEmptyMeaV2FocusCard(uuidv4()),
  };
}

export function validateMeaV2Content(content: MeaV2Content): string[] {
  const errors: string[] = [];
  (content.cards ?? []).forEach((card, i) => {
    if (!card.title.trim()) errors.push(`MEA v2 carte ${i + 1}: Titre requis`);
    if (!card.imageUrl) errors.push(`MEA v2 carte ${i + 1}: Image requise`);
  });
  const focus = content.focus;
  if (focus) {
    if (!focus.title.trim()) errors.push("MEA v2 carte focus: Titre requis");
    if (!focus.imageUrl) errors.push("MEA v2 carte focus: Image (vignette) requise");
    if (focus.mediaType === "video" && !focus.videoUrl) {
      errors.push("MEA v2 carte focus: Vidéo requise (mode vidéo activé)");
    }
  }
  return errors;
}
