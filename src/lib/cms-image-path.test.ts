import { describe, it, expect } from "vitest";
import {
  buildCmsImagePath,
  normalizeCustomPath,
  resolveCmsFolder,
  resolveCustomFolder,
  resolveImageBaseName,
  type ImagePathFields,
} from "./cms-image-path";

const ctx = { year: 2026, week: 36, locale: "fr" };

function fields(over: Partial<ImagePathFields> = {}): ImagePathFields {
  return {
    isGlobalImage: false,
    globalFileName: "",
    useCustomPath: false,
    customPath: "",
    ...over,
  };
}

describe("normalizeCustomPath", () => {
  it("retire espaces et slashes de début/fin", () => {
    expect(normalizeCustomPath("  /promo/noel/  ")).toBe("promo/noel");
    expect(normalizeCustomPath("promo/noel")).toBe("promo/noel");
    expect(normalizeCustomPath("///a///")).toBe("a");
  });

  it("tolère null/undefined/vide", () => {
    expect(normalizeCustomPath(null)).toBe("");
    expect(normalizeCustomPath(undefined)).toBe("");
    expect(normalizeCustomPath("   ")).toBe("");
  });
});

describe("resolveCustomFolder", () => {
  it("ne rend rien quand le toggle est inactif, même si des chemins existent", () => {
    expect(resolveCustomFolder(fields({ customPath: "promo" }), "landing")).toBe("");
  });

  it("préfère le chemin de l'item à celui de la section", () => {
    expect(resolveCustomFolder(fields({ useCustomPath: true, customPath: "promo/soldes" }), "landing")).toBe(
      "promo/soldes",
    );
  });

  it("hérite du chemin de section quand l'item n'en a pas", () => {
    expect(resolveCustomFolder(fields({ useCustomPath: true }), "landing-pages/campagne")).toBe(
      "landing-pages/campagne",
    );
  });

  it("rend vide quand le toggle est actif mais qu'aucun chemin n'existe nulle part", () => {
    expect(resolveCustomFolder(fields({ useCustomPath: true }), "")).toBe("");
  });
});

describe("resolveCmsFolder", () => {
  it("compose le dossier par défaut avec la semaine sur deux chiffres", () => {
    expect(resolveCmsFolder(fields(), "", { year: 2026, week: 7 }, null)).toBe("homepage/2026/wk07");
  });

  it("utilise imageWeek plutôt que la semaine du brief quand elle est renseignée", () => {
    expect(resolveCmsFolder(fields(), "", ctx, 30)).toBe("homepage/2026/wk30");
  });

  it("retombe sur le défaut quand le toggle est actif sans aucun chemin", () => {
    expect(resolveCmsFolder(fields({ useCustomPath: true }), "", ctx, null)).toBe("homepage/2026/wk36");
  });
});

describe("resolveImageBaseName", () => {
  it("garde le nom par défaut quand l'image n'est pas globale", () => {
    expect(resolveImageBaseName(fields({ globalFileName: "mon-visuel" }), "quickaccess-4")).toBe("quickaccess-4");
  });

  it("utilise le nom personnalisé quand l'image est globale", () => {
    expect(resolveImageBaseName(fields({ isGlobalImage: true, globalFileName: "mon-visuel" }), "quickaccess-4")).toBe(
      "mon-visuel",
    );
  });

  it("retombe sur le nom par défaut si le nom personnalisé est vide", () => {
    expect(resolveImageBaseName(fields({ isGlobalImage: true, globalFileName: "   " }), "quickaccess-4")).toBe(
      "quickaccess-4",
    );
  });
});

// Les cinq cas validés manuellement le 2026-09-08 sur un brief de test, figés ici.
describe("buildCmsImagePath", () => {
  it("défaut : homepage/{année}/wk{semaine}/{langue}/{nom}", () => {
    expect(buildCmsImagePath(fields(), ctx, null, "quickaccess-1")).toBe("homepage/2026/wk36/fr/quickaccess-1");
  });

  it("chemin hérité de la section", () => {
    expect(
      buildCmsImagePath(fields({ useCustomPath: true }), ctx, null, "quickaccess-2", "landing-pages/fille/campagne"),
    ).toBe("landing-pages/fille/campagne/fr/quickaccess-2");
  });

  it("chemin surchargé par l'item", () => {
    expect(
      buildCmsImagePath(
        fields({ useCustomPath: true, customPath: "promo/soldes" }),
        ctx,
        null,
        "quickaccess-3",
        "landing-pages/fille/campagne",
      ),
    ).toBe("promo/soldes/fr/quickaccess-3");
  });

  it("chemin hérité + image globale : pas de segment langue", () => {
    expect(
      buildCmsImagePath(
        fields({ useCustomPath: true, isGlobalImage: true }),
        ctx,
        null,
        "quickaccess-4",
        "landing-pages/fille/campagne",
      ),
    ).toBe("landing-pages/fille/campagne/quickaccess-4");
  });

  it("normalise les slashes du chemin saisi", () => {
    expect(
      buildCmsImagePath(fields({ useCustomPath: true, customPath: "/promo/noel/" }), ctx, null, "quickaccess-5"),
    ).toBe("promo/noel/fr/quickaccess-5");
  });

  it("image globale sans chemin custom : semaine conservée, langue retirée", () => {
    expect(buildCmsImagePath(fields({ isGlobalImage: true }), ctx, null, "quickaccess-6")).toBe(
      "homepage/2026/wk36/quickaccess-6",
    );
  });

  it("combine nom personnalisé et chemin personnalisé", () => {
    expect(
      buildCmsImagePath(
        fields({
          useCustomPath: true,
          customPath: "promo/soldes",
          isGlobalImage: true,
          globalFileName: "mon-visuel",
        }),
        ctx,
        null,
        "quickaccess-3",
      ),
    ).toBe("promo/soldes/mon-visuel");
  });
});
