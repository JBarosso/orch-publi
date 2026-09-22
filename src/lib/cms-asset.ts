import type { CmsPage, SectionType } from "@/types";

// Asset Salesforce dans lequel coller le code généré d'une section. Purement
// informatif : affiché à l'export, sans effet sur le code lui-même.

/**
 * Types de section qui produisent du code à coller. Les autres n'ont pas
 * d'asset à désigner : l'image sous-menu et la miniature offre n'exportent
 * que des fichiers, le moodboard n'exporte rien. Les macarons v1 n'y sont
 * pas non plus : les macarons sont toujours faits en v2 désormais.
 */
export const CMS_ASSET_SECTION_TYPES: SectionType[] = [
  "global_header",
  "ariane",
  "carousel",
  "macarons_v2",
  "mea_v2",
  "edito",
  "cat_banner",
  "custom",
];

// Libellés des colonnes de l'onglet Assets CMS. Le macaron v2 y est
// simplement « Macaron » : c'est le seul qui existe encore en pratique.
const COLUMN_LABELS: Partial<Record<SectionType, string>> = {
  global_header: "Global header",
  ariane: "Fil d'ariane",
  carousel: "Slider",
  macarons_v2: "Macaron",
  mea_v2: "MEA",
  edito: "Edito",
  cat_banner: "Cat banner",
  custom: "Section perso",
};

export function cmsAssetColumnLabel(type: SectionType): string {
  return COLUMN_LABELS[type] ?? type;
}

export function hasCmsAsset(type: SectionType): boolean {
  return CMS_ASSET_SECTION_TYPES.includes(type);
}

const HOMEPAGE_NAME = /^(hp|home|homepage|home page|page d'accueil|accueil)$/i;

/**
 * Page utilisée par une section qui n'en a pas choisi : celle cochée « par
 * défaut » dans l'onglet Assets CMS, sinon celle qui s'appelle comme la page
 * d'accueil (HP, Homepage, Accueil...) — pas « HP cat ... ».
 */
export function defaultCmsPage(pages: CmsPage[]): CmsPage | null {
  return pages.find((p) => p.isDefault) ?? pages.find((p) => HOMEPAGE_NAME.test(p.name.trim())) ?? null;
}

export interface ResolvedCmsAsset {
  assetId: string;
  /** "manual" = saisi sur la section, "page" = déduit de la page, "none" = rien trouvé. */
  origin: "manual" | "page" | "none";
  /** Page choisie sur la section (si elle existe toujours), sinon la page par défaut. */
  page: CmsPage | null;
}

export function resolveCmsAsset(
  section: { type: SectionType; cmsPageId: string | null; cmsAssetId: string },
  pages: CmsPage[],
): ResolvedCmsAsset {
  const page = pages.find((p) => p.id === section.cmsPageId) ?? defaultCmsPage(pages);
  const manual = (section.cmsAssetId ?? "").trim();
  if (manual) return { assetId: manual, origin: "manual", page };
  const deduced = (page?.assets?.[section.type] ?? "").trim();
  if (deduced) return { assetId: deduced, origin: "page", page };
  return { assetId: "", origin: "none", page };
}
