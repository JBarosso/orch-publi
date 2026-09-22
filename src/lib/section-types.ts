import type { SectionType } from "@/types";

// Types de section proposés à la création, dans l'ordre du menu. Paramétrage
// permet d'en masquer (cf. hidden-section-types.ts) : un type masqué n'est
// plus proposé, mais les sections existantes restent éditables et exportables.
export const SECTION_TYPE_OPTIONS: { value: SectionType; label: string }[] = [
  { value: "cat_banner", label: "Cat banner" },
  { value: "edito", label: "Edito" },
  { value: "ariane", label: "Fil d'ariane" },
  { value: "global_header", label: "Global header" },
  { value: "img_sous_menu", label: "Img sous menu" },
  { value: "macarons", label: "Macaron (old)" },
  { value: "macarons_v2", label: "Macaron" },
  { value: "mea", label: "MEA (old)" },
  { value: "mea_v2", label: "MEA" },
  { value: "miniature_offre", label: "Miniature offre" },
  { value: "moodboard", label: "Moodboard" },
  { value: "custom", label: "Section custom" },
  { value: "carousel", label: "Slider" },
];

/** Masqués tant que rien n'a été choisi dans Paramétrage : les anciennes versions. */
export const DEFAULT_HIDDEN_SECTION_TYPES: SectionType[] = ["macarons", "mea"];

/** Ne garde que des types connus, sans doublon. */
export function sanitizeHiddenSectionTypes(value: unknown): SectionType[] {
  if (!Array.isArray(value)) return DEFAULT_HIDDEN_SECTION_TYPES;
  const known = new Set(SECTION_TYPE_OPTIONS.map((o) => o.value));
  return [...new Set(value.filter((v): v is SectionType => known.has(v)))];
}
