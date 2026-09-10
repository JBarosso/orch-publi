"use client";

// Pendant visuel de `registry.ts` : à chaque type de section, son éditeur, son
// aperçu, et la façon de ranger une image ou une vidéo choisie. Séparé du
// registre principal parce que celui-ci est chargé par les routes API — y
// mêler des composants React tirerait tout le front dans les bundles serveur.
//
// Les éditeurs existants n'ont pas tous la même signature (certains reçoivent
// `items`, d'autres `content` ; MEA v2 et carousel ont un upload vidéo ;
// macarons a une variante v1/v2). Plutôt que de les réécrire, chaque entrée
// est un petit adaptateur qui traduit les props uniformes ci-dessous vers
// celles du composant. C'est aussi ici que vit la correspondance
// "emplacement visé -> type d'asset", auparavant dispersée dans page.tsx.

import type { ReactNode } from "react";
import type {
  ArianeContent,
  AssetType,
  CarouselContent,
  CatBannerContent,
  CustomContent,
  EditoContent,
  GlobalHeaderContent,
  ImgSousMenuContent,
  Locale,
  MacaronsContent,
  MeaContent,
  MeaV2Content,
  MiniatureOffreContent,
} from "@/types";
import { normalizeCustomContent } from "@/templates/custom/schema";

import { MacaronsEditor } from "@/templates/macarons/editor";
import { MeaEditor } from "@/templates/mea/editor";
import { CustomEditor } from "@/templates/custom/editor";
import { MeaV2Editor } from "@/templates/mea-v2/editor";
import { ArianeEditor } from "@/templates/ariane/editor";
import { EditoEditor } from "@/templates/edito/editor";
import { ImgSousMenuEditor } from "@/templates/img-sous-menu/editor";
import { CatBannerEditor } from "@/templates/cat-banner/editor";
import { MiniatureOffreEditor } from "@/templates/miniature-offre/editor";
import { CarouselEditor } from "@/templates/carousel/editor";
import { GlobalHeaderEditor } from "@/templates/global-header/editor";

import { MacaronsPreview } from "@/templates/macarons/preview";
import { MeaPreview } from "@/templates/mea/preview";
import { CustomPreview } from "@/templates/custom/preview";
import { MacaronsV2Preview } from "@/templates/macarons-v2/preview";
import { MeaV2Preview } from "@/templates/mea-v2/preview";
import { ArianePreview } from "@/templates/ariane/preview";
import { EditoPreview } from "@/templates/edito/preview";
import { ImgSousMenuPreview } from "@/templates/img-sous-menu/preview";
import { CatBannerPreview } from "@/templates/cat-banner/preview";
import { MiniatureOffrePreview } from "@/templates/miniature-offre/preview";
import { CarouselPreview } from "@/templates/carousel/preview";
import { GlobalHeaderPreview } from "@/templates/global-header/preview";

export interface TemplateEditorProps {
  content: unknown;
  brief: { year: number; week: number; locale: Locale };
  onChange: (content: unknown) => void;
  /** `target` désigne l'item, le bloc ou la carte visé dans la section. */
  onOpenMedia: (target: string, assetType: AssetType) => void;
  onDropFile: (target: string, assetType: AssetType, file: File) => void;
  onOpenVideoUpload: (target: string) => void;
  /** Démo publique : masque l'import CMS, les réglages de chemin CMS et la vidéo. */
  minimal?: boolean;
}

export interface TemplateUi {
  Editor?: (props: TemplateEditorProps) => ReactNode;
  Preview?: (props: { content: unknown }) => ReactNode;
  /** Range l'URL choisie (médiathèque ou upload) au `target` passé à `onOpenMedia`. */
  setImage?: (content: unknown, target: string, url: string) => unknown;
  /** Upload vidéo direct, enchaîné sur l'upload de sa vignette. */
  video?: {
    assetType: AssetType;
    /** Range l'URL au `target` passé à `onOpenVideoUpload`. */
    set: (content: unknown, target: string, url: string) => unknown;
    /** Emplacement qui reçoit la vignette capturée sur la 1re frame. */
    poster: (target: string) => { target: string; assetType: AssetType };
  };
}

/** Remplace la liste d'items en conservant les réglages de section (ex: customPath). */
function withItems(content: unknown, items: unknown): unknown {
  return { ...((content ?? {}) as Record<string, unknown>), items };
}

// Une nouvelle image est un fichier natif de la semaine du brief : semaine et
// position figées redeviennent dynamiques.
function setItemImage(content: unknown, itemId: string, url: string): unknown {
  const items = ((content as { items?: { id: string }[] })?.items ?? []).map((item) =>
    item.id === itemId ? { ...item, imageUrl: url, imageWeek: null, exportPosition: null } : item,
  );
  return withItems(content, items);
}

export const TEMPLATE_UI: Record<string, TemplateUi> = {
  macarons: {
    Editor: ({ content, brief, onChange, onOpenMedia, onDropFile }) => (
      <MacaronsEditor
        items={(content as MacaronsContent)?.items ?? []}
        briefWeek={brief.week}
        briefYear={brief.year}
        briefLocale={brief.locale}
        onChange={(items) => onChange(withItems(content, items))}
        onOpenMediaLibrary={(itemId) => onOpenMedia(itemId, "macaron")}
        onDropFile={(itemId, file) => onDropFile(itemId, "macaron", file)}
      />
    ),
    Preview: ({ content }) => <MacaronsPreview items={(content as MacaronsContent)?.items ?? []} />,
    setImage: setItemImage,
  },

  macarons_v2: {
    Editor: ({ content, brief, onChange, onOpenMedia, onDropFile, minimal }) => (
      <MacaronsEditor
        // La variante v1 n'a ni import CMS ni réglages de chemin : c'est
        // exactement la version réduite voulue pour la démo.
        variant={minimal ? "v1" : "v2"}
        items={(content as MacaronsContent)?.items ?? []}
        briefWeek={brief.week}
        briefYear={brief.year}
        briefLocale={brief.locale}
        sectionCustomPath={(content as MacaronsContent)?.customPath ?? ""}
        onSectionCustomPathChange={(customPath) =>
          onChange({ ...((content ?? {}) as MacaronsContent), customPath })
        }
        onChange={(items) => onChange(withItems(content, items))}
        onOpenMediaLibrary={(itemId) => onOpenMedia(itemId, "macaron_v2")}
        onDropFile={(itemId, file) => onDropFile(itemId, "macaron_v2", file)}
      />
    ),
    Preview: ({ content }) => <MacaronsV2Preview items={(content as MacaronsContent)?.items ?? []} />,
    setImage: setItemImage,
  },

  mea: {
    Editor: ({ content, brief, onChange, onOpenMedia, onDropFile }) => (
      <MeaEditor
        items={(content as MeaContent)?.items ?? []}
        briefWeek={brief.week}
        briefYear={brief.year}
        briefLocale={brief.locale}
        onChange={(items) => onChange(withItems(content, items))}
        onOpenMediaLibrary={(itemId) => onOpenMedia(itemId, "mea")}
        onDropFile={(itemId, file) => onDropFile(itemId, "mea", file)}
      />
    ),
    Preview: ({ content }) => <MeaPreview items={(content as MeaContent)?.items ?? []} />,
    setImage: setItemImage,
  },

  mea_v2: {
    Editor: ({ content, brief, onChange, onOpenMedia, onDropFile, onOpenVideoUpload, minimal }) => (
      <MeaV2Editor
        minimal={minimal}
        content={content as MeaV2Content}
        briefWeek={brief.week}
        briefYear={brief.year}
        briefLocale={brief.locale}
        onChange={(next) => onChange(next)}
        // La carte focus a son propre type d'asset (dimensions différentes).
        onOpenMediaLibrary={(target) =>
          onOpenMedia(target, target === "focus" ? "mea_v2_focus" : "mea_v2")
        }
        onDropFile={(target, file) =>
          onDropFile(target, target === "focus" ? "mea_v2_focus" : "mea_v2", file)
        }
        onOpenVideoUpload={() => onOpenVideoUpload("focus")}
      />
    ),
    Preview: ({ content }) => <MeaV2Preview content={content as MeaV2Content} />,
    // Targets : "focus" ou "card-<index>".
    setImage: (content, target, url) => {
      const c = content as MeaV2Content;
      if (target === "focus") {
        return { ...c, focus: { ...c.focus, imageUrl: url, imageWeek: null } };
      }
      const index = Number(target.replace("card-", ""));
      return {
        ...c,
        cards: c.cards.map((card, i) =>
          i === index ? { ...card, imageUrl: url, imageWeek: null } : card,
        ),
      };
    },
    video: {
      assetType: "mea_v2_video",
      set: (content, _target, url) => {
        const c = content as MeaV2Content;
        return { ...c, focus: { ...c.focus, mediaType: "video", videoUrl: url } };
      },
      poster: () => ({ target: "focus", assetType: "mea_v2_focus" }),
    },
  },

  custom: {
    Editor: ({ content, brief, onChange, onOpenMedia, onDropFile }) => (
      <CustomEditor
        content={content as CustomContent}
        briefWeek={brief.week}
        onChange={(next) => onChange(next)}
        onOpenMediaLibrary={(blockId) => onOpenMedia(blockId, "other")}
        onDropFile={(blockId, file) => onDropFile(blockId, "other", file)}
      />
    ),
    Preview: ({ content }) => <CustomPreview content={content as CustomContent} />,
    setImage: (content, target, url) => {
      const c = normalizeCustomContent(content);
      return {
        ...c,
        blocks: c.blocks.map((block) =>
          block.id === target ? { ...block, imageUrl: url, imageWeek: null } : block,
        ),
      };
    },
  },

  edito: {
    Editor: ({ content, brief, onChange, onOpenMedia, onDropFile }) => (
      <EditoEditor
        items={(content as EditoContent)?.items ?? []}
        briefWeek={brief.week}
        onChange={(items) => onChange(withItems(content, items))}
        onOpenMediaLibrary={(itemId) => onOpenMedia(itemId, "edito")}
        onDropFile={(itemId, file) => onDropFile(itemId, "edito", file)}
      />
    ),
    Preview: ({ content }) => <EditoPreview items={(content as EditoContent)?.items ?? []} />,
    setImage: setItemImage,
  },

  img_sous_menu: {
    Editor: ({ content, brief, onChange, onOpenMedia, onDropFile }) => (
      <ImgSousMenuEditor
        items={(content as ImgSousMenuContent)?.items ?? []}
        briefWeek={brief.week}
        onChange={(items) => onChange(withItems(content, items))}
        onOpenMediaLibrary={(itemId) => onOpenMedia(itemId, "img_sous_menu")}
        onDropFile={(itemId, file) => onDropFile(itemId, "img_sous_menu", file)}
      />
    ),
    Preview: ({ content }) => (
      <ImgSousMenuPreview items={(content as ImgSousMenuContent)?.items ?? []} />
    ),
    setImage: setItemImage,
  },

  cat_banner: {
    // Le suffixe du target (":desktop") distingue les deux visuels d'une bannière.
    Editor: ({ content, brief, onChange, onOpenMedia, onDropFile }) => (
      <CatBannerEditor
        items={(content as CatBannerContent)?.items ?? []}
        briefWeek={brief.week}
        onChange={(items) => onChange(withItems(content, items))}
        onOpenMediaLibrary={(target) =>
          onOpenMedia(target, target.endsWith(":desktop") ? "cat_banner_desktop" : "cat_banner_mobile")
        }
        onDropFile={(target, file) =>
          onDropFile(
            target,
            target.endsWith(":desktop") ? "cat_banner_desktop" : "cat_banner_mobile",
            file,
          )
        }
      />
    ),
    Preview: ({ content }) => <CatBannerPreview items={(content as CatBannerContent)?.items ?? []} />,
    setImage: (content, target, url) => {
      const [itemId, slot] = target.split(":");
      const field = slot === "desktop" ? "desktopImageUrl" : "mobileImageUrl";
      const items = ((content as CatBannerContent)?.items ?? []).map((item) =>
        item.id === itemId ? { ...item, [field]: url, imageWeek: null, exportPosition: null } : item,
      );
      return withItems(content, items);
    },
  },

  miniature_offre: {
    Editor: ({ content, brief, onChange, onOpenMedia, onDropFile }) => (
      <MiniatureOffreEditor
        items={(content as MiniatureOffreContent)?.items ?? []}
        briefWeek={brief.week}
        onChange={(items) => onChange(withItems(content, items))}
        onOpenMediaLibrary={(itemId) => onOpenMedia(itemId, "miniature_offre")}
        onDropFile={(itemId, file) => onDropFile(itemId, "miniature_offre", file)}
      />
    ),
    Preview: ({ content }) => (
      <MiniatureOffrePreview items={(content as MiniatureOffreContent)?.items ?? []} />
    ),
    setImage: setItemImage,
  },

  carousel: {
    // Le préfixe "title-" distingue le titre en image du visuel de fond.
    Editor: ({ content, brief, onChange, onOpenMedia, onDropFile, onOpenVideoUpload }) => (
      <CarouselEditor
        content={content as CarouselContent}
        briefWeek={brief.week}
        onChange={(next) => onChange(next)}
        onOpenMediaLibrary={(target) =>
          onOpenMedia(target, target.startsWith("title-") ? "carousel_title" : "carousel")
        }
        onDropFile={(target, file) =>
          onDropFile(target, target.startsWith("title-") ? "carousel_title" : "carousel", file)
        }
        onOpenVideoUpload={(slideIndex) => onOpenVideoUpload(String(slideIndex))}
      />
    ),
    Preview: ({ content }) => <CarouselPreview content={content as CarouselContent} />,
    // Targets : "slide-<index>" ou "title-<index>".
    setImage: (content, target, url) => {
      const c = content as CarouselContent;
      const [kind, index] = target.split("-");
      return {
        ...c,
        slides: c.slides.map((slide, i) => {
          if (i !== Number(index)) return slide;
          return kind === "title"
            ? { ...slide, titleImageUrl: url, titleImageWeek: null }
            : { ...slide, imageUrl: url, imageWeek: null };
        }),
      };
    },
    video: {
      assetType: "carousel_video",
      // Le target est l'index de la diapositive.
      set: (content, target, url) => {
        const c = content as CarouselContent;
        return {
          ...c,
          slides: c.slides.map((slide, i) =>
            i === Number(target) ? { ...slide, mediaType: "video", videoUrl: url } : slide,
          ),
        };
      },
      poster: (target) => ({ target: `slide-${target}`, assetType: "carousel" }),
    },
  },

  ariane: {
    Editor: ({ content, onChange }) => (
      <ArianeEditor content={content as ArianeContent} onChange={(next) => onChange(next)} />
    ),
    Preview: ({ content }) => <ArianePreview content={content as ArianeContent} />,
  },

  global_header: {
    Editor: ({ content, brief, onChange }) => (
      <GlobalHeaderEditor
        content={content as GlobalHeaderContent}
        locale={brief.locale}
        onChange={(next) => onChange(next)}
      />
    ),
    Preview: ({ content }) => <GlobalHeaderPreview content={content as GlobalHeaderContent} />,
  },
};
