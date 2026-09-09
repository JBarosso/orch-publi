import { describe, it, expect } from "vitest";
import { getSectionImages } from "@/templates/registry";
import { createEmptyMacaron } from "@/templates/macarons/schema";
import { createEmptyMea } from "@/templates/mea/schema";
import { createEmptyEditoCard } from "@/templates/edito/schema";
import { createEmptyMeaV2Content } from "@/templates/mea-v2/schema";
import type { MacaronItem } from "@/types";

const IMG = "https://example.test/image.jpg";

/** Tuiles 1..n dont seules celles listées dans `withImage` portent une image. */
function macaronsWithGaps(total: number, withImage: number[]): MacaronItem[] {
  return Array.from({ length: total }, (_, i) => ({
    ...createEmptyMacaron(`id-${i + 1}`),
    label: `tuile ${i + 1}`,
    imageUrl: withImage.includes(i + 1) ? IMG : "",
  }));
}

// Régression du bug corrigé le 2026-09-01 : les items sans image étaient
// retirés AVANT le calcul de la position, si bien que la 4e tuile renseignée
// était exportée en "quickaccess-1" alors que le HTML pointait sur
// "quickaccess-4". La position doit suivre le rang dans le template, pas le
// rang parmi les seules images présentes.
describe("position des images quand des items sont vides", () => {
  it("quickaccess v2 : les tuiles 4 à 9 gardent leur position", () => {
    const content = { items: macaronsWithGaps(9, [4, 5, 6, 7, 8, 9]) };
    const names = getSectionImages("macarons_v2", content).map((e) => e.baseName);
    expect(names).toEqual([
      "quickaccess-4",
      "quickaccess-5",
      "quickaccess-6",
      "quickaccess-7",
      "quickaccess-8",
      "quickaccess-9",
    ]);
  });

  it("macarons v1 : même règle", () => {
    const content = { items: macaronsWithGaps(4, [3]) };
    expect(getSectionImages("macarons", content).map((e) => e.baseName)).toEqual(["quickaccess-3"]);
  });

  it("mea v1 : même règle", () => {
    const items = [1, 2, 3].map((n) => ({
      ...createEmptyMea(`id-${n}`),
      imageUrl: n === 3 ? IMG : "",
    }));
    expect(getSectionImages("mea", { items }).map((e) => e.baseName)).toEqual(["mea-3"]);
  });

  it("edito : la position compte toutes les cartes (pas de toggle visible)", () => {
    const items = [1, 2, 3].map((n) => ({
      ...createEmptyEditoCard(`id-${n}`),
      imageUrl: n === 2 ? IMG : "",
    }));
    expect(getSectionImages("edito", { items }).map((e) => e.baseName)).toEqual(["edito-2"]);
  });

  it("les items masqués ne consomment pas de position", () => {
    const items = macaronsWithGaps(3, [1, 2, 3]);
    items[0].visible = false;
    expect(getSectionImages("macarons_v2", { items }).map((e) => e.baseName)).toEqual([
      "quickaccess-1",
      "quickaccess-2",
    ]);
  });
});

describe("exportPosition fige la position", () => {
  it("prime sur le rang courant dans la liste", () => {
    const items = macaronsWithGaps(2, [1, 2]);
    items[0].exportPosition = 7;
    expect(getSectionImages("macarons_v2", { items }).map((e) => e.baseName)).toEqual([
      "quickaccess-7",
      "quickaccess-2",
    ]);
  });
});

describe("chemin personnalisé et image globale", () => {
  it("propage le dossier de la section aux items qui l'activent", () => {
    const items = macaronsWithGaps(2, [1, 2]);
    items[0].useCustomPath = true;
    const entries = getSectionImages("macarons_v2", { items, customPath: "landing-pages/campagne" });
    expect(entries[0].customFolder).toBe("landing-pages/campagne");
    expect(entries[1].customFolder).toBeUndefined();
  });

  it("le chemin de l'item prime sur celui de la section", () => {
    const items = macaronsWithGaps(1, [1]);
    items[0].useCustomPath = true;
    items[0].customPath = "promo/soldes";
    const entries = getSectionImages("macarons_v2", { items, customPath: "landing-pages/campagne" });
    expect(entries[0].customFolder).toBe("promo/soldes");
  });

  it("marque noLocale et applique le nom personnalisé sur une image globale", () => {
    const items = macaronsWithGaps(1, [1]);
    items[0].isGlobalImage = true;
    items[0].globalFileName = "mon-visuel";
    const [entry] = getSectionImages("macarons_v2", { items });
    expect(entry.noLocale).toBe(true);
    expect(entry.baseName).toBe("mon-visuel");
  });
});

describe("MEA v2", () => {
  it("numérote les cartes et réserve mea-5 à la carte focus", () => {
    const content = createEmptyMeaV2Content();
    content.cards[0].imageUrl = IMG;
    content.cards[2].imageUrl = IMG;
    content.focus.imageUrl = IMG;
    expect(getSectionImages("mea_v2", content).map((e) => e.baseName)).toEqual(["mea-1", "mea-3", "mea-5"]);
  });

  it("ajoute la vidéo de la carte focus sous le même nom que sa vignette", () => {
    const content = createEmptyMeaV2Content();
    content.focus.imageUrl = IMG;
    content.focus.mediaType = "video";
    content.focus.videoUrl = "https://example.test/video.mp4";
    const entries = getSectionImages("mea_v2", content);
    expect(entries.map((e) => e.baseName)).toEqual(["mea-5", "mea-5"]);
    expect(entries.filter((e) => e.isVideo)).toHaveLength(1);
  });
});

describe("types sans image", () => {
  it("rend une liste vide plutôt que d'échouer", () => {
    expect(getSectionImages("ariane", {})).toEqual([]);
    expect(getSectionImages("type-inconnu", {})).toEqual([]);
    expect(getSectionImages("macarons_v2", undefined)).toEqual([]);
  });
});
