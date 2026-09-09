import { describe, it, expect } from "vitest";
import { normalizeSectionContent } from "@/templates/registry";
import type { MacaronsContent, MeaContent, MeaV2Content } from "@/types";

// Ces cas reproduisent des lignes réellement en base : du JSON enregistré
// avant l'ajout de certains champs. Sans complétion, ces champs remontent en
// `undefined` jusqu'aux Switch/Input contrôlés et provoquent l'avertissement
// React "uncontrolled to controlled".
describe("normalisation — quickaccess v2 / macarons", () => {
  it("complète les champs de chemin absents d'un ancien item", () => {
    const ancien = { items: [{ id: "a", label: "tuile", imageUrl: "x.jpg" }] };
    const c = normalizeSectionContent("macarons_v2", ancien) as MacaronsContent;
    const item = c.items[0];

    expect(item.isGlobalImage).toBe(false);
    expect(item.globalFileName).toBe("");
    expect(item.useCustomPath).toBe(false);
    expect(item.customPath).toBe("");
    expect(item.visible).toBe(true);
    expect(item.exportPosition).toBeNull();
    // Ce qui était stocké n'est jamais écrasé
    expect(item.label).toBe("tuile");
    expect(item.imageUrl).toBe("x.jpg");
    expect(item.id).toBe("a");
  });

  it("conserve une valeur stockée même quand elle vaut false ou une chaîne vide", () => {
    const stocke = { items: [{ id: "a", visible: false, label: "", isGlobalImage: true }] };
    const c = normalizeSectionContent("macarons", stocke) as MacaronsContent;
    expect(c.items[0].visible).toBe(false);
    expect(c.items[0].label).toBe("");
    expect(c.items[0].isGlobalImage).toBe(true);
  });

  it("préserve les réglages de section à côté des items", () => {
    const c = normalizeSectionContent("macarons_v2", {
      customPath: "landing/campagne",
      items: [],
    }) as MacaronsContent;
    expect(c.customPath).toBe("landing/campagne");
  });

  it("tolère un contenu vide ou absent", () => {
    expect((normalizeSectionContent("macarons_v2", {}) as MacaronsContent).items).toEqual([]);
    expect((normalizeSectionContent("macarons_v2", null) as MacaronsContent).items).toEqual([]);
  });
});

describe("normalisation — MEA v1", () => {
  it("complète les champs prix et les boutons d'un ancien item", () => {
    const ancien = { items: [{ id: "a", title: "Rentrée" }] };
    const item = (normalizeSectionContent("mea", ancien) as MeaContent).items[0];

    expect(item.pricingMode).toBe("standard");
    expect(item.showPrePrice).toBe(true);
    expect(item.buttons).toHaveLength(1);
    expect(item.buttons[0].cid).toBe("");
    expect(item.title).toBe("Rentrée");
  });

  it("complète les champs manquants d'un bouton existant sans perdre les autres", () => {
    const ancien = { items: [{ id: "a", buttons: [{ text: "Voir", linkType: "cgid", cgid: "outlet" }] }] };
    const btn = (normalizeSectionContent("mea", ancien) as MeaContent).items[0].buttons[0];
    expect(btn.text).toBe("Voir");
    expect(btn.cgid).toBe("outlet");
    expect(btn.cid).toBe("");
    expect(btn.link).toBe("");
  });
});

describe("normalisation — MEA v2", () => {
  it("complète les cartes et garantit les 4 emplacements attendus par la grille", () => {
    const ancien = { cards: [{ id: "c1", title: "Carte 1" }] };
    const c = normalizeSectionContent("mea_v2", ancien) as MeaV2Content;

    expect(c.cards).toHaveLength(4);
    expect(c.cards[0].title).toBe("Carte 1");
    expect(c.cards[0].showBrandLogo).toBe(false);
    expect(c.cards[0].pricingMode).toBe("standard");
    expect(c.cards[0].useCustomPath).toBe(false);
  });

  it("fusionne appelPrix partiel au lieu de l'écraser en bloc", () => {
    const ancien = { cards: [], focus: { id: "f", appelPrix: { enabled: true, title: "Offre" } } };
    const focus = (normalizeSectionContent("mea_v2", ancien) as MeaV2Content).focus;

    expect(focus.appelPrix.enabled).toBe(true);
    expect(focus.appelPrix.title).toBe("Offre");
    // Champs absents du JSON stocké : repris du défaut, et non undefined
    expect(focus.appelPrix.initialPrice).toBe("");
    expect(focus.appelPrix.clubPrice).toBe("");
    expect(focus.appelPrix.showClubIcon).toBe(true);
  });

  it("fournit une carte focus complète même quand elle est absente", () => {
    const focus = (normalizeSectionContent("mea_v2", { cards: [] }) as MeaV2Content).focus;
    expect(focus.mediaType).toBe("image");
    expect(focus.appelPrix.enabled).toBe(false);
    expect(focus.buttons).toHaveLength(1);
  });
});

describe("normalisation — templates sans normaliseur", () => {
  it("rend le contenu inchangé", () => {
    const content = { links: [{ id: "l1" }], title: "x" };
    expect(normalizeSectionContent("ariane", content)).toBe(content);
    expect(normalizeSectionContent("type-inconnu", content)).toBe(content);
  });
});
