import { useMemo, useSyncExternalStore } from "react";
import type { BriefSection } from "@/types";

// Presse-papiers de section : un seul emplacement, rangé dans le navigateur
// (localStorage) pour survivre au passage d'un brief à l'autre et être vu par
// les autres onglets. Chaque copie remplace la précédente. C'est un
// instantané : la section telle qu'affichée au moment de la copie.

const KEY = "orch-publi:section-clipboard";
// L'événement « storage » ne prévient que les autres onglets : celui-ci
// prévient l'onglet qui vient de copier.
const CHANGE_EVENT = "orch-publi:section-clipboard-change";

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
}

/** false si le navigateur refuse (navigation privée, quota dépassé). */
export function writeCopiedSection(section: CopiedSection): boolean {
  try {
    localStorage.setItem(KEY, JSON.stringify(section));
    window.dispatchEvent(new Event(CHANGE_EVENT));
    return true;
  } catch {
    return false;
  }
}

function subscribe(onChange: () => void): () => void {
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) onChange();
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(CHANGE_EVENT, onChange);
  };
}

// La chaîne brute sert d'instantané : stable tant qu'elle ne change pas.
function readRaw(): string | null {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

/** Dernière section copiée, ou null (toujours null au rendu serveur). */
export function useCopiedSection(): CopiedSection | null {
  const raw = useSyncExternalStore(subscribe, readRaw, () => null);
  return useMemo(() => {
    if (!raw) return null;
    try {
      return JSON.parse(raw) as CopiedSection;
    } catch {
      return null;
    }
  }, [raw]);
}
