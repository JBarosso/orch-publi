import { describe, it, expect } from "vitest";
import type { MacaronItem } from "@/types";
import { generateQuickaccessV2HTML } from "./export";

const CTX = { year: 2026, week: 7, locale: "fr" };

function item(overrides: Partial<MacaronItem> = {}): MacaronItem {
  return {
    id: "a",
    label: "Parkas",
    comment: "",
    linkType: "cgid",
    cgid: "ga-manteau",
    cid: "",
    link: "",
    imageUrl: "https://cdn.test/a.jpg",
    imageId: "abcd1234",
    imageWeek: null,
    exportPosition: null,
    visible: true,
    isGlobalImage: false,
    globalFileName: "",
    useCustomPath: false,
    customPath: "",
    ...overrides,
  } as MacaronItem;
}

describe("emplacement CMS du quickaccess v2", () => {
  // Régression : l'export écrivait toujours les classes de la page d'accueil.
  // Une section récupérée d'une page catégorie niveau 2 en ressortait donc
  // habillée en page d'accueil, et perdait tout son style une fois reposée.
  it("écrit les classes de la page d'accueil par défaut", () => {
    const html = generateQuickaccessV2HTML([item()], CTX);
    expect(html).toContain('<nav class="quickaccess-v2 hp-cat-container"');
    expect(html).toContain('<ul class="quickaccess-v2__list" role="list">');
    expect(html).toContain('class="quickaccess-v2-item"');
    expect(html).toContain('class="quickaccess-v2-item__picture"');
    expect(html).toContain('class="quickaccess-v2-item__img"');
    expect(html).toContain('class="quickaccess-v2-item__label"');
    expect(html).not.toContain("lvl2");
  });

  // Relevé sur le HTML réel : la classe de conteneur n'est pas au même endroit
  // qu'en page d'accueil — elle passe du <nav> au <ul>, et change de nom.
  it("écrit les classes de la catégorie niveau 2, conteneur compris", () => {
    const html = generateQuickaccessV2HTML([item()], CTX, null, "cat_lvl2");
    expect(html).toContain('<nav class="quickaccess-lvl2" aria-label=');
    expect(html).toContain('<ul class="quickaccess-lvl2__list hp-cat-lvl2-container" role="list">');
    expect(html).toContain('class="quickaccess-lvl2-item"');
    expect(html).toContain('class="quickaccess-lvl2-item__picture"');
    expect(html).toContain('class="quickaccess-lvl2-item__img"');
    expect(html).toContain('class="quickaccess-lvl2-item__label"');
    expect(html).not.toContain("quickaccess-v2");
    expect(html).not.toContain("hp-cat-container");
  });

  it("ne touche qu'aux classes : chemins d'image, liens et libellés inchangés", () => {
    const homepage = generateQuickaccessV2HTML([item()], CTX);
    const lvl2 = generateQuickaccessV2HTML([item()], CTX, null, "cat_lvl2");
    for (const stable of [
      "homepage/2026/wk07/fr/quickaccess-1.jpg?$staticlink$",
      "homepage/2026/wk07/fr/quickaccess-1.webp?$staticlink$",
      "$url('Search-Show','cgid','ga-manteau')$",
      ">Parkas</h3>",
      'width="200"',
      'height="300"',
    ]) {
      expect(homepage).toContain(stable);
      expect(lvl2).toContain(stable);
    }
  });
});
