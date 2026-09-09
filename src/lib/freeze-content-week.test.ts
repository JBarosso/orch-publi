import { describe, it, expect } from "vitest";
import { freezeSectionContentWeek } from "@/templates/registry";
import { createEmptyMacaron } from "@/templates/macarons/schema";
import { createEmptyEditoCard } from "@/templates/edito/schema";
import type { MacaronsContent, EditoContent } from "@/types";

// À la duplication d'un brief vers une autre semaine, un item natif de la
// semaine source doit continuer de pointer vers le fichier qui existe
// réellement — donc semaine ET position figées. Un item déjà figé sur une
// semaine antérieure n'est pas retouché : on ne fige qu'une fois.
describe("freezeSectionContentWeek — macarons", () => {
  it("fige la semaine et la position des items natifs", () => {
    const items = [1, 2].map((n) => createEmptyMacaron(`id-${n}`));
    const result = freezeSectionContentWeek("macarons_v2", { items }, 32) as MacaronsContent;
    expect(result.items.map((i) => [i.imageWeek, i.exportPosition])).toEqual([
      [32, 1],
      [32, 2],
    ]);
  });

  it("laisse intact un item déjà figé sur une autre semaine", () => {
    const items = [createEmptyMacaron("id-1"), createEmptyMacaron("id-2")];
    items[0].imageWeek = 28;
    items[0].exportPosition = 5;
    const result = freezeSectionContentWeek("macarons", { items }, 32) as MacaronsContent;
    expect([result.items[0].imageWeek, result.items[0].exportPosition]).toEqual([28, 5]);
    expect([result.items[1].imageWeek, result.items[1].exportPosition]).toEqual([32, 2]);
  });

  it("ne compte que les items visibles dans la position figée", () => {
    const items = [1, 2, 3].map((n) => createEmptyMacaron(`id-${n}`));
    items[0].visible = false;
    const result = freezeSectionContentWeek("macarons_v2", { items }, 32) as MacaronsContent;
    // L'item masqué ne reçoit pas de position, les suivants sont numérotés 1 et 2.
    expect(result.items.map((i) => i.exportPosition)).toEqual([null, 1, 2]);
  });

  it("traite un item natif dont imageWeek vaut déjà la semaine source", () => {
    const items = [createEmptyMacaron("id-1")];
    items[0].imageWeek = 32;
    const result = freezeSectionContentWeek("macarons_v2", { items }, 32) as MacaronsContent;
    expect([result.items[0].imageWeek, result.items[0].exportPosition]).toEqual([32, 1]);
  });
});

describe("freezeSectionContentWeek — edito", () => {
  it("numérote toutes les cartes, sans notion de visibilité", () => {
    const items = [1, 2, 3].map((n) => createEmptyEditoCard(`id-${n}`));
    const result = freezeSectionContentWeek("edito", { items }, 30) as EditoContent;
    expect(result.items.map((i) => i.exportPosition)).toEqual([1, 2, 3]);
    expect(result.items.every((i) => i.imageWeek === 30)).toBe(true);
  });
});

describe("freezeSectionContentWeek — types non concernés", () => {
  it("rend le contenu tel quel", () => {
    const content = { title: "x", links: [] };
    expect(freezeSectionContentWeek("ariane", content, 32)).toBe(content);
    expect(freezeSectionContentWeek("type-inconnu", content, 32)).toBe(content);
  });
});
