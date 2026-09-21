import { describe, it, expect } from "vitest";
import {
  createArrowElement,
  createEmptyMoodboardContent,
  createImageElement,
  createShapeElement,
  createTextElement,
  fitWithin,
  normalizeMoodboardContent,
} from "./schema";

describe("fitWithin (capture collée)", () => {
  it("réduit une capture plein écran en gardant ses proportions", () => {
    expect(fitWithin(1920, 1080, 640, 360)).toEqual({ width: 640, height: 360 });
    // Plus haute que large : c'est la hauteur qui limite.
    expect(fitWithin(800, 1600, 640, 360)).toEqual({ width: 180, height: 360 });
  });

  // Une petite capture (une zone d'écran) ne doit pas être agrandie :
  // elle deviendrait floue.
  it("n'agrandit jamais une capture déjà plus petite que le cadre", () => {
    expect(fitWithin(300, 120, 640, 360)).toEqual({ width: 300, height: 120 });
  });
});

describe("createEmptyMoodboardContent", () => {
  it("démarre sans élément, sur un fond blanc au format diapositive", () => {
    expect(createEmptyMoodboardContent()).toEqual({
      canvasWidth: 1280,
      canvasHeight: 720,
      backgroundColor: "#ffffff",
      elements: [],
      comment: "",
    });
  });
});

describe("fabriques d'éléments", () => {
  it("posent chaque élément à la position demandée, au premier plan (zIndex 1) sur un tableau vide", () => {
    expect(createTextElement([], 10, 20)).toMatchObject({ type: "text", x: 10, y: 20, zIndex: 1 });
    expect(createShapeElement([], 10, 20)).toMatchObject({ type: "shape", x: 10, y: 20, zIndex: 1 });
    expect(createImageElement([], 10, 20)).toMatchObject({ type: "image", x: 10, y: 20, zIndex: 1 });
  });

  it("la flèche part du point donné vers la droite", () => {
    const arrow = createArrowElement([], 10, 20);
    expect(arrow).toMatchObject({ type: "arrow", x1: 10, y1: 20, y2: 20 });
    expect(arrow.x2).toBeGreaterThan(arrow.x1);
  });

  it("un nouvel élément passe toujours au-dessus des existants", () => {
    const first = createTextElement([], 0, 0);
    const second = createShapeElement([first], 0, 0);
    expect(second.zIndex).toBeGreaterThan(first.zIndex);
  });
});

describe("normalizeMoodboardContent", () => {
  it("complète un contenu vide avec les défauts", () => {
    expect(normalizeMoodboardContent(null)).toEqual(createEmptyMoodboardContent());
    expect(normalizeMoodboardContent(undefined)).toEqual(createEmptyMoodboardContent());
  });

  it("reconstruit chaque type d'élément avec ses propres défauts pour les champs manquants", () => {
    const result = normalizeMoodboardContent({
      elements: [
        { id: "t1", type: "text", x: 5, y: 5 }, // color/fontSize/align/bold manquants
        { id: "s1", type: "shape" },
        { id: "i1", type: "image" },
        { id: "a1", type: "arrow" },
      ],
    });
    expect(result.elements).toEqual([
      { id: "t1", type: "text", zIndex: 0, x: 5, y: 5, width: 260, height: 90, text: "", color: "#18181b", fontSize: 20, bold: false, align: "left" },
      { id: "s1", type: "shape", zIndex: 0, x: 0, y: 0, width: 220, height: 130, color: "#c7d4da", radius: 8 },
      { id: "i1", type: "image", zIndex: 0, x: 0, y: 0, width: 280, height: 200, imageUrl: "", imageId: expect.any(String) },
      { id: "a1", type: "arrow", zIndex: 0, x1: 0, y1: 0, x2: 180, y2: 0, color: "#18181b", strokeWidth: 3 },
    ]);
  });

  // Régression potentielle : un contenu corrompu ou une future extension avec
  // un type non reconnu ne doit jamais faire planter tout le moodboard.
  it("écarte un élément dont le type est inconnu ou absent, sans planter", () => {
    const result = normalizeMoodboardContent({
      elements: [{ id: "x", type: "unknown-future-type" }, { id: "y" }, "not-even-an-object", null],
    });
    expect(result.elements).toEqual([]);
  });

  it("ignore un `elements` qui n'est pas un tableau", () => {
    expect(normalizeMoodboardContent({ elements: "oops" }).elements).toEqual([]);
  });

  it("conserve les réglages du tableau (fond, dimensions, commentaire) déjà enregistrés", () => {
    const result = normalizeMoodboardContent({
      canvasWidth: 800,
      canvasHeight: 600,
      backgroundColor: "#000000",
      comment: "à vérifier",
      elements: [],
    });
    expect(result).toMatchObject({ canvasWidth: 800, canvasHeight: 600, backgroundColor: "#000000", comment: "à vérifier" });
  });
});
