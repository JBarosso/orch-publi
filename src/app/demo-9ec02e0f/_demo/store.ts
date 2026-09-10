import { useSyncExternalStore } from "react";
import { v4 as uuidv4 } from "uuid";
import type { Locale, MacaronItem, MeaButton, MeaV2Content } from "@/types";
import { createEmptyMacaron } from "@/templates/macarons/schema";
import { createEmptyButton } from "@/templates/mea/schema";
import { createEmptyMeaV2Content } from "@/templates/mea-v2/schema";
import { DEMO_GALLERY } from "./config";

// Données de la démo : uniquement dans le navigateur (localStorage). Aucune
// base, aucun appel aux routes protégées — un brief créé pendant une démo
// n'existe que sur le poste qui l'a créé.

export type DemoSectionType = "macarons_v2" | "mea_v2";

export const DEMO_SECTION_TYPES: DemoSectionType[] = ["macarons_v2", "mea_v2"];

export const DEMO_SECTION_LABELS: Record<DemoSectionType, string> = {
  macarons_v2: "Quickaccess v2",
  mea_v2: "MEA v2",
};

export interface DemoSection {
  id: string;
  type: DemoSectionType;
  title: string;
  content: unknown;
}

export interface DemoBrief {
  id: string;
  name: string;
  year: number;
  week: number;
  locale: Locale;
  sections: DemoSection[];
}

export function briefLabel(brief: DemoBrief): string {
  return brief.name || `Brief S${String(brief.week).padStart(2, "0")} ${brief.locale}`;
}

export function createDemoSection(type: DemoSectionType): DemoSection {
  return {
    id: uuidv4(),
    type,
    title: DEMO_SECTION_LABELS[type],
    content: type === "mea_v2" ? createEmptyMeaV2Content() : { items: [] },
  };
}

// --- Briefs d'exemple ---

const imageFor = (label: string) => DEMO_GALLERY.find((image) => image.label === label)?.url ?? "";

function tile(label: string, cgid: string): MacaronItem {
  return { ...createEmptyMacaron(uuidv4()), label: label.toLowerCase(), cgid, imageUrl: imageFor(label) };
}

function button(text: string, cgid: string): MeaButton {
  return { ...createEmptyButton(), text, cgid };
}

function exampleMeaV2(): MeaV2Content {
  const content = createEmptyMeaV2Content();
  const cards = [
    { title: "Literie", cgid: "literie" },
    { title: "Gigoteuses", cgid: "gigoteuses" },
    { title: "Chaise haute", cgid: "chaises-hautes" },
    { title: "Collection Pluie", cgid: "collection-pluie" },
  ];
  return {
    ...content,
    cards: content.cards.map((card, i) => ({
      ...card,
      title: cards[i].title,
      cgid: cards[i].cgid,
      imageUrl: imageFor(cards[i].title),
      prePriceText: "À partir de",
      initialPrice: "29,99€",
      clubPrice: "23,99€",
      buttons: [button("Découvrir", cards[i].cgid)],
    })),
    focus: {
      ...content.focus,
      title: "Collection Denim",
      cgid: "collection-denim",
      imageUrl: imageFor("Collection Denim"),
      buttons: [button("Je découvre", "collection-denim")],
    },
  };
}

// Identifiants fixes : un lien vers un brief d'exemple reste valable après un
// rechargement, même avant la première modification.
function createExampleBriefs(): DemoBrief[] {
  return [
    {
      id: "exemple-rentree",
      name: "Rentrée des classes",
      year: 2026,
      week: 38,
      locale: "FR",
      sections: [
        {
          id: uuidv4(),
          type: "macarons_v2",
          title: "Quickaccess",
          content: {
            items: [
              tile("T-shirts", "t-shirts"),
              tile("Pyjamas", "pyjamas"),
              tile("Sweats", "sweats"),
              tile("Pantalons", "pantalons"),
              tile("Robots", "robots"),
              tile("Poussettes", "poussettes"),
              tile("Chaises hautes", "chaises-hautes"),
              tile("Sièges auto", "sieges-auto"),
            ],
          },
        },
        { id: uuidv4(), type: "mea_v2", title: "MEA", content: exampleMeaV2() },
      ],
    },
    {
      id: "exemple-automne",
      name: "Collection automne",
      year: 2026,
      week: 40,
      locale: "FR",
      sections: [
        {
          id: uuidv4(),
          type: "macarons_v2",
          title: "Quickaccess",
          content: {
            items: [
              tile("Ensembles", "ensembles"),
              tile("Robes", "robes"),
              tile("Dors-bien", "dors-bien"),
              tile("Boîtes à histoire", "boites-a-histoire"),
            ],
          },
        },
      ],
    },
  ];
}

// --- Store ---

const STORAGE_KEY = "brief-builder-demo";
const listeners = new Set<() => void>();
// Snapshot mis en cache par valeur brute : useSyncExternalStore exige la même
// référence tant que rien n'a changé.
let snapshot: { raw: string | null; briefs: DemoBrief[] } | null = null;
// Stockage refusé (navigation privée stricte) : la démo marche quand même,
// le temps de la session.
let memoryRaw: string | null = null;

function readRaw(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return memoryRaw;
  }
}

function writeRaw(raw: string | null) {
  memoryRaw = raw;
  try {
    if (raw === null) localStorage.removeItem(STORAGE_KEY);
    else localStorage.setItem(STORAGE_KEY, raw);
  } catch {
    // reste en mémoire
  }
}

function getSnapshot(): DemoBrief[] {
  const raw = readRaw();
  if (snapshot && snapshot.raw === raw) return snapshot.briefs;
  let briefs: DemoBrief[];
  try {
    briefs = raw ? (JSON.parse(raw) as DemoBrief[]) : createExampleBriefs();
  } catch {
    briefs = createExampleBriefs();
  }
  snapshot = { raw, briefs };
  return briefs;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** null pendant le rendu serveur : le localStorage n'existe que dans le navigateur. */
export function useDemoBriefs(): DemoBrief[] | null {
  return useSyncExternalStore(subscribe, getSnapshot, () => null);
}

export function updateDemoBriefs(updater: (briefs: DemoBrief[]) => DemoBrief[]) {
  const briefs = updater(getSnapshot());
  const raw = JSON.stringify(briefs);
  writeRaw(raw);
  snapshot = { raw, briefs };
  listeners.forEach((listener) => listener());
}

export function updateDemoBrief(id: string, updater: (brief: DemoBrief) => DemoBrief) {
  updateDemoBriefs((briefs) => briefs.map((brief) => (brief.id === id ? updater(brief) : brief)));
}

/** Retour aux briefs d'exemple, à lancer avant chaque présentation. */
export function resetDemo() {
  writeRaw(null);
  snapshot = null;
  listeners.forEach((listener) => listener());
}
