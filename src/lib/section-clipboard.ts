import { createClipboard } from "@/lib/clipboard-store";
import type { BriefSection } from "@/types";

// Section copiée : un instantané de la section telle qu'affichée au moment de
// la copie. La dernière copie remplace la précédente.
export interface CopiedSection {
  type: BriefSection["type"];
  title: string;
  content: unknown;
  visible: boolean;
  cmsPageId: string | null;
  cmsAssetId: string;
  /** Semaine et langue du brief d'origine : le collage fige les images et détache les bibliothèques si besoin. */
  sourceWeek: number;
  sourceLocale: string;
  /** Absent des copies faites avant l'ajout du repère « copié il y a… ». */
  copiedAt?: string;
}

const clipboard = createClipboard<CopiedSection>("orch-publi:section-clipboard");

export const writeCopiedSection = clipboard.write;
export const clearCopiedSection = clipboard.clear;
export const useCopiedSection = clipboard.useValue;
