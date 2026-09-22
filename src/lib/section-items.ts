// Sections dont les items se copient/collent un par un. `kind` dit où un item
// peut être collé (les deux versions du macaron partagent la même forme),
// `key` la liste qui les porte dans le contenu de la section. MEA v2 et slider
// n'y sont pas : nombre de cartes fixe, rien à « ajouter ».
export const ITEM_SECTIONS = {
  macarons: { kind: "macaron", key: "items" },
  macarons_v2: { kind: "macaron", key: "items" },
  mea: { kind: "mea", key: "items" },
  edito: { kind: "edito", key: "items" },
  img_sous_menu: { kind: "img_sous_menu", key: "items" },
  cat_banner: { kind: "cat_banner", key: "items" },
  miniature_offre: { kind: "miniature_offre", key: "items" },
  global_header: { kind: "global_header", key: "items" },
  ariane: { kind: "ariane", key: "links" },
} as const;

export type ItemSectionType = keyof typeof ITEM_SECTIONS;

export function isItemSectionType(type: unknown): type is ItemSectionType {
  return typeof type === "string" && Object.hasOwn(ITEM_SECTIONS, type);
}
