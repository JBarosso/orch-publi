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

// À la duplication vers une AUTRE langue, un bloc chargé depuis la
// bibliothèque (filtrée par langue) n'a plus rien à voir avec le nouveau
// contenu : le détacher, sans quoi « Mettre à jour » écraserait le bloc de la
// langue d'origine avec le texte de la nouvelle. Même règle que le GH.
export function detachEditoLibraryLinks(content: EditoContent): EditoContent {
  return {
    ...content,
    items: (content.items ?? []).map((item) => ({ ...item, sourceItemId: null })),
  };
}

export function validateEditoContent(items: EditoCard[]): string[] {
  const errors: string[] = [];
  items.forEach((item, i) => {
    if (!item.title.trim()) errors.push(`Edito ${i + 1}: Titre requis`);
    if (!item.imageUrl) errors.push(`Edito ${i + 1}: Image requise`);
  });
  return errors;
}
