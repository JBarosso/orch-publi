// Registre des templates de section : la carte unique du système.
//
// Chaque type de section déclare ici ce qu'il sait faire. Ajouter un template
// revient à créer son dossier `src/templates/<nom>/` puis à ajouter une entrée
// dans TEMPLATES — plus aucune cascade de `if (type === ...)` à mettre à jour
// dans les routes d'export, la duplication de brief ou la collecte d'images.
//
// Ce fichier ne doit importer QUE des modules neutres (schémas, générateurs
// HTML, collecte d'images) : il est chargé côté serveur par les routes API.
// Les composants React (éditeur, aperçu) vivent dans un registre séparé pour
// ne pas alourdir les bundles.

import type { ImageEntry } from "@/lib/section-images";
import {
  freezeCarouselContent,
  freezeCustomContent,
  freezeItemsNoVisible,
  freezeItemsWithVisible,
  freezeMeaV2Content,
} from "@/lib/freeze-content-week";

import type {
  ArianeContent,
  CarouselContent,
  CatBannerContent,
  CustomContent,
  EditoContent,
  GlobalHeaderContent,
  ImgSousMenuContent,
  MacaronsContent,
  MeaContent,
  MeaV2Content,
  MiniatureOffreContent,
} from "@/types";

// Générateurs HTML
import { generateMacaronsHTML } from "@/templates/macarons/export";
import { generateMeaHTML } from "@/templates/mea/export";
import { generateCustomHTML } from "@/templates/custom/export";
import { generateQuickaccessV2HTML } from "@/templates/macarons-v2/export";
import { generateMeaV2HTML } from "@/templates/mea-v2/export";
import { generateArianeHTML } from "@/templates/ariane/export";
import { generateEditoHTML } from "@/templates/edito/export";
import { generateCarouselHTML } from "@/templates/carousel/export";
import { generateGlobalHeaderHTML } from "@/templates/global-header/export";
import { generateCatBannerHTML } from "@/templates/cat-banner/export";

// Collecte des images
import { getMacaronImages } from "@/templates/macarons/images";
import { getMeaImages } from "@/templates/mea/images";
import { getCustomImages } from "@/templates/custom/images";
import { getMacaronsV2Images } from "@/templates/macarons-v2/images";
import { getMeaV2Images } from "@/templates/mea-v2/images";
import { getEditoImages } from "@/templates/edito/images";
import { getCarouselImages } from "@/templates/carousel/images";
import { getImgSousMenuImages } from "@/templates/img-sous-menu/images";
import { getCatBannerImages } from "@/templates/cat-banner/images";
import { getMiniatureOffreImages } from "@/templates/miniature-offre/images";

// Contenus par défaut et normalisation
import { createEmptyCustomContent, normalizeCustomContent } from "@/templates/custom/schema";
import { normalizeMacaronsContent } from "@/templates/macarons/schema";
import { normalizeMeaContent } from "@/templates/mea/schema";
import { createEmptyMeaV2Content, normalizeMeaV2Content } from "@/templates/mea-v2/schema";
import { createEmptyArianeContent } from "@/templates/ariane/schema";
import { createEmptyCarouselContent } from "@/templates/carousel/schema";
import { createEmptyGlobalHeaderContent } from "@/templates/global-header/schema";
import { createEmptyEditoContent } from "@/templates/edito/schema";
import { createEmptyCatBannerContent } from "@/templates/cat-banner/schema";
import { createEmptyImgSousMenuContent } from "@/templates/img-sous-menu/schema";
import { createEmptyMiniatureOffreContent } from "@/templates/miniature-offre/schema";

export interface ExportContext {
  year: number;
  week: number;
  locale: string;
}

export interface TemplateDefinition<TContent> {
  /** Contenu d'une section fraîchement créée. */
  createEmptyContent: () => TContent;
  /**
   * Complète un contenu lu en base avec les champs ajoutés après sa
   * création. Le `content` est du JSON non validé : les anciennes lignes
   * n'ont pas les champs récents.
   */
  normalizeContent?: (content: unknown) => TContent;
  /** HTML à coller dans le CMS. Absent = ce template n'exporte que des images. */
  generateHTML?: (content: TContent, ctx: ExportContext) => string;
  /** Fichiers à placer dans le ZIP. Absent = ce template n'a pas d'image. */
  getImages?: (content: TContent) => ImageEntry[];
  /** Gel semaine/position à la duplication vers une autre semaine. */
  freezeWeek?: (content: TContent, originalWeek: number) => TContent;
}

// Le contenu est stocké en JSON non typé : chaque définition est écrite avec
// son vrai type puis effacée ici. Le cast est concentré en un seul endroit —
// il remplace la trentaine de `content as XContent` qui étaient auparavant
// dispersés dans les routes.
function defineTemplate<T>(def: TemplateDefinition<T>): TemplateDefinition<unknown> {
  return def as TemplateDefinition<unknown>;
}

const emptyItems = () => ({ items: [] });

export const TEMPLATES: Record<string, TemplateDefinition<unknown>> = {
  macarons: defineTemplate<MacaronsContent>({
    createEmptyContent: emptyItems,
    normalizeContent: normalizeMacaronsContent,
    generateHTML: (c, ctx) => generateMacaronsHTML(c?.items ?? [], ctx),
    getImages: getMacaronImages,
    freezeWeek: freezeItemsWithVisible,
  }),

  macarons_v2: defineTemplate<MacaronsContent>({
    createEmptyContent: emptyItems,
    normalizeContent: normalizeMacaronsContent,
    generateHTML: (c, ctx) => generateQuickaccessV2HTML(c?.items ?? [], ctx, c?.customPath),
    getImages: getMacaronsV2Images,
    freezeWeek: freezeItemsWithVisible,
  }),

  mea: defineTemplate<MeaContent>({
    createEmptyContent: emptyItems,
    normalizeContent: normalizeMeaContent,
    generateHTML: (c, ctx) => generateMeaHTML(c?.items ?? [], ctx),
    getImages: getMeaImages,
    freezeWeek: freezeItemsWithVisible,
  }),

  mea_v2: defineTemplate<MeaV2Content>({
    createEmptyContent: createEmptyMeaV2Content,
    normalizeContent: normalizeMeaV2Content,
    generateHTML: generateMeaV2HTML,
    getImages: getMeaV2Images,
    freezeWeek: freezeMeaV2Content,
  }),

  custom: defineTemplate<CustomContent>({
    createEmptyContent: createEmptyCustomContent,
    normalizeContent: normalizeCustomContent,
    generateHTML: generateCustomHTML,
    getImages: getCustomImages,
    freezeWeek: freezeCustomContent,
  }),

  edito: defineTemplate<EditoContent>({
    createEmptyContent: createEmptyEditoContent,
    generateHTML: (c, ctx) => generateEditoHTML(c?.items ?? [], ctx),
    getImages: getEditoImages,
    freezeWeek: freezeItemsNoVisible,
  }),

  carousel: defineTemplate<CarouselContent>({
    createEmptyContent: createEmptyCarouselContent,
    generateHTML: generateCarouselHTML,
    getImages: getCarouselImages,
    freezeWeek: freezeCarouselContent,
  }),

  cat_banner: defineTemplate<CatBannerContent>({
    createEmptyContent: createEmptyCatBannerContent,
    generateHTML: (c, ctx) => generateCatBannerHTML(c?.items ?? [], ctx),
    getImages: getCatBannerImages,
  }),

  // Pas de HTML généré : seuls les fichiers image comptent, l'intégration CMS
  // se fait à la main à partir du ZIP.
  img_sous_menu: defineTemplate<ImgSousMenuContent>({
    createEmptyContent: createEmptyImgSousMenuContent,
    getImages: getImgSousMenuImages,
    freezeWeek: freezeItemsNoVisible,
  }),

  miniature_offre: defineTemplate<MiniatureOffreContent>({
    createEmptyContent: createEmptyMiniatureOffreContent,
    getImages: getMiniatureOffreImages,
  }),

  // Pas d'image : uniquement du texte et des liens.
  ariane: defineTemplate<ArianeContent>({
    createEmptyContent: createEmptyArianeContent,
    generateHTML: (c) => generateArianeHTML(c),
  }),

  global_header: defineTemplate<GlobalHeaderContent>({
    createEmptyContent: createEmptyGlobalHeaderContent,
    generateHTML: (c) => generateGlobalHeaderHTML(c),
  }),
};

export const SECTION_TYPES = Object.keys(TEMPLATES);

function contentFor(type: string, raw: unknown): unknown {
  return TEMPLATES[type]?.normalizeContent?.(raw) ?? raw;
}

/**
 * Complète le contenu d'une section avec les champs ajoutés après sa
 * création. À appliquer sur tout contenu qui sort vers le client : sans ça,
 * les champs manquants remontent en `undefined` jusqu'aux composants
 * contrôlés. Sans effet pour les templates qui n'ont pas de normaliseur.
 */
export function normalizeSectionContent(type: string, content: unknown): unknown {
  return contentFor(type, content);
}

/** Contenu initial d'une section nouvellement créée. */
export function createEmptySectionContent(type: string): unknown {
  return TEMPLATES[type]?.createEmptyContent() ?? { items: [] };
}

/** HTML à copier dans le CMS — chaîne vide si le template n'en produit pas. */
export function generateSectionHTML(type: string, content: unknown, ctx: ExportContext): string {
  const template = TEMPLATES[type];
  if (!template?.generateHTML) return "";
  return template.generateHTML(contentFor(type, content), ctx);
}

/**
 * Fichiers image/vidéo à placer dans le ZIP. Point d'entrée unique de
 * l'export simple, "tous les fichiers" et groupé.
 */
export function getSectionImages(type: string, content: unknown): ImageEntry[] {
  const template = TEMPLATES[type];
  if (!template?.getImages) return [];
  return template.getImages(contentFor(type, content));
}

/** Gel semaine/position appliqué à la duplication d'un brief. */
export function freezeSectionContentWeek(
  type: string,
  content: unknown,
  originalWeek: number,
): unknown {
  const template = TEMPLATES[type];
  if (!template?.freezeWeek) return content;
  return template.freezeWeek(contentFor(type, content), originalWeek);
}
