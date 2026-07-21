import type { GlobalHeaderContent, GlobalHeaderItem } from "@/types";
import { v4 as uuidv4 } from "uuid";

export const MAX_GLOBAL_HEADER_ITEMS = 3;
export const DEFAULT_GLOBAL_HEADER_BG = "#ee1f2d";

export function createEmptyGlobalHeaderItem(): GlobalHeaderItem {
  return {
    id: uuidv4(),
    sourceItemId: null,
    comment: "",
    label: "",
    text: "",
    linkType: "none",
    cgid: "",
    cid: "",
    link: "",
  };
}

export function createEmptyGlobalHeaderContent(): GlobalHeaderContent {
  return { items: [], bgColor: DEFAULT_GLOBAL_HEADER_BG };
}

// À la duplication vers une AUTRE langue, un item chargé depuis la
// bibliothèque (sourceItemId) n'a plus rien à voir avec le nouveau contenu
// (traduit ou non) : le détacher pour éviter qu'un "Mettre à jour" écrase
// par erreur l'item de la langue d'origine avec le contenu de la nouvelle.
export function detachGlobalHeaderLibraryLinks(content: GlobalHeaderContent): GlobalHeaderContent {
  return {
    ...content,
    items: (content.items ?? []).map((item) => ({ ...item, sourceItemId: null })),
  };
}

export function validateGlobalHeaderContent(content: GlobalHeaderContent): string[] {
  const errors: string[] = [];
  const items = content.items ?? [];
  if (items.length === 0) errors.push("Global header : au moins un item requis");
  items.forEach((item, i) => {
    if (!item.text.trim()) errors.push(`Global header item ${i + 1}: texte requis`);
  });
  return errors;
}
