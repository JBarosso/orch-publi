import { describe, it, expect } from "vitest";
import {
  computeBlankBands,
  describeBlankSides,
  hasFillableBlanks,
  pickGenerationSize,
} from "./ai-fill";

describe("computeBlankBands", () => {
  it("ne voit aucune bande vide quand le cadre tient entièrement dans l'image", () => {
    const bands = computeBlankBands({ x: 100, y: 100, width: 1000, height: 600 }, 2000, 2000, 1000, 600);
    expect(bands).toMatchObject({ left: 0, top: 0, right: 0, bottom: 0 });
    expect(hasFillableBlanks(bands)).toBe(false);
  });

  it("mesure les bandes laissées de part et d'autre par un dézoom horizontal", () => {
    const bands = computeBlankBands({ x: -200, y: 0, width: 1000, height: 600 }, 600, 600, 1000, 600);
    expect(bands).toMatchObject({ left: 200, right: 200, top: 0, bottom: 0 });
    expect(hasFillableBlanks(bands)).toBe(true);
    expect(describeBlankSides(bands)).toBe("à gauche et à droite");
  });

  // Le cadre est exprimé dans le repère de l'image source, la sortie dans
  // celui du canevas : un facteur d'échelle sépare les deux, et le masque
  // envoyé à l'IA est en pixels de sortie.
  it("exprime les bandes en pixels de sortie, pas en pixels de l'image source", () => {
    const bands = computeBlankBands({ x: -100, y: 0, width: 500, height: 300 }, 300, 300, 1000, 600);
    expect(bands).toMatchObject({ left: 200, right: 200, canvasWidth: 1000, canvasHeight: 600 });
  });

  it("repère une bande sur un seul côté", () => {
    const bands = computeBlankBands({ x: 0, y: 0, width: 1000, height: 600 }, 800, 600, 1000, 600);
    expect(bands).toMatchObject({ left: 0, right: 200, top: 0, bottom: 0 });
    expect(describeBlankSides(bands)).toBe("à droite");
  });

  // Sans dimensions cibles, le canevas prend la taille du cadre — que le
  // navigateur tronque, canvas.width étant un entier.
  it("tronque comme le navigateur quand aucune dimension cible n'est imposée", () => {
    const bands = computeBlankBands({ x: 0, y: 0, width: 1000.7, height: 600.9 }, 2000, 2000);
    expect(bands).toMatchObject({ canvasWidth: 1000, canvasHeight: 600 });
  });
});

describe("hasFillableBlanks", () => {
  // Une image quasi entièrement hors cadre ne laisse presque rien à prolonger :
  // proposer la génération produirait une image inventée de bout en bout.
  it("refuse quand il ne reste presque plus d'image d'origine", () => {
    const bands = computeBlankBands({ x: -450, y: -250, width: 1000, height: 600 }, 100, 100, 1000, 600);
    expect(bands).toMatchObject({ left: 450, right: 450, top: 250, bottom: 250 });
    expect(hasFillableBlanks(bands)).toBe(false);
  });
});

describe("pickGenerationSize", () => {
  it("choisit le format généré dont le ratio est le plus proche de la cible", () => {
    expect(pickGenerationSize(1000, 600)).toBe("1536x1024");
    expect(pickGenerationSize(200, 300)).toBe("1024x1536");
    expect(pickGenerationSize(200, 200)).toBe("1024x1024");
    expect(pickGenerationSize(1920, 1080)).toBe("1536x1024");
    // 600x700 est presque carré : le format carré est plus proche que le
    // portrait 2:3, malgré l'orientation verticale de la cible.
    expect(pickGenerationSize(600, 700)).toBe("1024x1024");
  });
});
