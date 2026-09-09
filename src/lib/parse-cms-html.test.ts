import { describe, it, expect } from "vitest";
import {
  freezeImportedPosition,
  isEmptyCmsLink,
  parseCmsImagePath,
  parseCmsLink,
  resolveGlobalImageFields,
  resolveImportedCustomPath,
  sharedCustomPath,
} from "./parse-cms-html";
import { buildCmsImagePath, type ImagePathFields } from "./cms-image-path";

describe("parseCmsLink", () => {
  it("reconnaît un lien catégorie (cgid)", () => {
    expect(parseCmsLink("$url('Search-Show','cgid','outlet')$")).toEqual({
      linkType: "cgid",
      cgid: "outlet",
      cid: "",
      link: "",
    });
  });

  it("reconnaît un lien page (cid) dans les deux formes générées par l'app", () => {
    expect(parseCmsLink("$httpsUrl('Page-Show','cid','aide-faq')$").cid).toBe("aide-faq");
    expect(parseCmsLink("$url('Search-Show','cid','aide-faq')$").cid).toBe("aide-faq");
  });

  it("retombe sur une URL libre", () => {
    expect(parseCmsLink("/fr/rentree.html")).toEqual({
      linkType: "url",
      cgid: "",
      cid: "",
      link: "/fr/rentree.html",
    });
  });

  it("traite '#' et le vide comme une absence de lien", () => {
    expect(parseCmsLink("#").link).toBe("");
    expect(parseCmsLink("").link).toBe("");
    expect(parseCmsLink(null).link).toBe("");
  });
});

describe("isEmptyCmsLink", () => {
  it("détecte un lien sans destination quel que soit le type", () => {
    expect(isEmptyCmsLink({ linkType: "cgid", cgid: "", cid: "", link: "" })).toBe(true);
    expect(isEmptyCmsLink({ linkType: "cid", cgid: "", cid: "  ", link: "" })).toBe(true);
    expect(isEmptyCmsLink({ linkType: "url", cgid: "", cid: "", link: "" })).toBe(true);
    expect(isEmptyCmsLink({ linkType: "cgid", cgid: "outlet", cid: "", link: "" })).toBe(false);
  });
});

describe("parseCmsImagePath", () => {
  it("chemin par défaut avec langue", () => {
    expect(parseCmsImagePath("homepage/2026/wk36/fr/quickaccess-1.jpg?$staticlink$")).toEqual({
      year: 2026,
      week: 36,
      locale: "fr",
      baseName: "quickaccess-1",
      customPath: "",
    });
  });

  it("chemin par défaut sans langue (image globale)", () => {
    expect(parseCmsImagePath("homepage/2026/wk36/quickaccess-4.jpg")).toEqual({
      year: 2026,
      week: 36,
      locale: null,
      baseName: "quickaccess-4",
      customPath: "",
    });
  });

  it("chemin personnalisé avec langue : ni année ni semaine", () => {
    expect(parseCmsImagePath("landing-pages/fille/campagne/fr/quickaccess-2.webp")).toEqual({
      year: null,
      week: null,
      locale: "fr",
      baseName: "quickaccess-2",
      customPath: "landing-pages/fille/campagne",
    });
  });

  it("chemin personnalisé sans langue", () => {
    expect(parseCmsImagePath("promo/soldes/mon-visuel.jpg")).toEqual({
      year: null,
      week: null,
      locale: null,
      baseName: "mon-visuel",
      customPath: "promo/soldes",
    });
  });

  it("reconnaît le dossier 'be' partagé par BEFR/BENL", () => {
    expect(parseCmsImagePath("homepage/2026/wk36/be/mea-1.jpg")?.locale).toBe("be");
  });

  it("gère la vidéo de la carte focus", () => {
    expect(parseCmsImagePath("homepage/2026/wk36/fr/mea-5.mp4?$staticlink$")?.baseName).toBe("mea-5");
  });

  it("rend null sur ce qui n'est pas un chemin d'image reconnaissable", () => {
    expect(parseCmsImagePath("")).toBeNull();
    expect(parseCmsImagePath(null)).toBeNull();
    expect(parseCmsImagePath("quickaccess-1.jpg")).toBeNull();
    expect(parseCmsImagePath("blob:http://localhost/abc")).toBeNull();
  });
});

describe("freezeImportedPosition", () => {
  it("ne fige rien quand l'image est native de la semaine du brief", () => {
    const path = parseCmsImagePath("homepage/2026/wk36/fr/quickaccess-1.jpg");
    expect(freezeImportedPosition(path, 36, 1)).toEqual({ imageWeek: null, exportPosition: null });
  });

  it("fige semaine et position quand l'image vient d'une autre semaine", () => {
    const path = parseCmsImagePath("homepage/2026/wk30/fr/quickaccess-5.jpg");
    expect(freezeImportedPosition(path, 36, 2)).toEqual({ imageWeek: 30, exportPosition: 5 });
  });

  it("retombe sur la position de liste quand le nom ne porte pas de numéro", () => {
    const path = parseCmsImagePath("homepage/2026/wk30/fr/mon-visuel.jpg");
    expect(freezeImportedPosition(path, 36, 3)).toEqual({ imageWeek: 30, exportPosition: 3 });
  });

  it("ne fige rien sur un chemin personnalisé (il ne porte pas de semaine)", () => {
    const path = parseCmsImagePath("landing-pages/campagne/fr/quickaccess-1.jpg");
    expect(freezeImportedPosition(path, 36, 1)).toEqual({ imageWeek: null, exportPosition: null });
  });
});

describe("resolveGlobalImageFields", () => {
  it("pas global quand le chemin porte une langue", () => {
    const path = parseCmsImagePath("homepage/2026/wk36/fr/quickaccess-1.jpg");
    expect(resolveGlobalImageFields(path, "quickaccess-1")).toEqual({
      isGlobalImage: false,
      globalFileName: "",
    });
  });

  it("global sans nom personnalisé quand le nom suit le nommage automatique", () => {
    const path = parseCmsImagePath("homepage/2026/wk36/quickaccess-3.jpg");
    expect(resolveGlobalImageFields(path, "quickaccess-3")).toEqual({
      isGlobalImage: true,
      globalFileName: "",
    });
  });

  it("global avec nom personnalisé quand le nom diffère du nommage automatique", () => {
    const path = parseCmsImagePath("homepage/2026/wk36/mon-visuel.jpg");
    expect(resolveGlobalImageFields(path, "quickaccess-3")).toEqual({
      isGlobalImage: true,
      globalFileName: "mon-visuel",
    });
  });
});

describe("resolveImportedCustomPath", () => {
  it("active le toggle uniquement quand un chemin personnalisé est détecté", () => {
    expect(resolveImportedCustomPath(parseCmsImagePath("promo/soldes/fr/quickaccess-1.jpg"))).toEqual({
      useCustomPath: true,
      customPath: "promo/soldes",
    });
    expect(resolveImportedCustomPath(parseCmsImagePath("homepage/2026/wk36/fr/quickaccess-1.jpg"))).toEqual({
      useCustomPath: false,
      customPath: "",
    });
    expect(resolveImportedCustomPath(null)).toEqual({ useCustomPath: false, customPath: "" });
  });
});

describe("sharedCustomPath", () => {
  it("remonte le chemin quand toutes les images le partagent", () => {
    expect(
      sharedCustomPath([
        { useCustomPath: true, customPath: "landing/campagne" },
        { useCustomPath: true, customPath: "landing/campagne" },
      ]),
    ).toBe("landing/campagne");
  });

  it("ne remonte rien quand les chemins diffèrent", () => {
    expect(
      sharedCustomPath([
        { useCustomPath: true, customPath: "landing/campagne" },
        { useCustomPath: true, customPath: "promo/soldes" },
      ]),
    ).toBe("");
  });

  it("ignore les items qui n'utilisent pas de chemin personnalisé", () => {
    expect(
      sharedCustomPath([
        { useCustomPath: false, customPath: "" },
        { useCustomPath: true, customPath: "landing/campagne" },
      ]),
    ).toBe("landing/campagne");
    expect(sharedCustomPath([{ useCustomPath: false, customPath: "" }])).toBe("");
  });
});

// Le test qui compte le plus : ce que l'export écrit, l'import doit savoir le
// relire. Toute divergence entre buildCmsImagePath et parseCmsImagePath casse
// ici avant d'atteindre le CMS.
describe("aller-retour export -> import", () => {
  const ctx = { year: 2026, week: 36, locale: "fr" };

  const cases: { nom: string; fields: ImagePathFields; sectionPath?: string; defaultName: string }[] = [
    {
      nom: "défaut",
      fields: { isGlobalImage: false, globalFileName: "", useCustomPath: false, customPath: "" },
      defaultName: "quickaccess-1",
    },
    {
      nom: "globale",
      fields: { isGlobalImage: true, globalFileName: "", useCustomPath: false, customPath: "" },
      defaultName: "quickaccess-2",
    },
    {
      nom: "chemin hérité de la section",
      fields: { isGlobalImage: false, globalFileName: "", useCustomPath: true, customPath: "" },
      sectionPath: "landing-pages/fille/campagne",
      defaultName: "quickaccess-3",
    },
    {
      nom: "chemin de l'item + globale + nom personnalisé",
      fields: {
        isGlobalImage: true,
        globalFileName: "mon-visuel",
        useCustomPath: true,
        customPath: "promo/soldes",
      },
      defaultName: "quickaccess-4",
    },
  ];

  for (const c of cases) {
    it(`reconstruit les champs — ${c.nom}`, () => {
      const path = buildCmsImagePath(c.fields, ctx, null, c.defaultName, c.sectionPath);
      const parsed = parseCmsImagePath(`${path}.jpg?$staticlink$`);
      expect(parsed).not.toBeNull();

      expect(resolveGlobalImageFields(parsed, c.defaultName).isGlobalImage).toBe(c.fields.isGlobalImage);
      expect(resolveGlobalImageFields(parsed, c.defaultName).globalFileName).toBe(c.fields.globalFileName);

      const reimported = resolveImportedCustomPath(parsed);
      expect(reimported.useCustomPath).toBe(c.fields.useCustomPath);
      // Le chemin revient sur l'item ; sharedCustomPath le remontera ensuite
      // au niveau de la section s'il est commun à toutes les images.
      const expectedPath = c.fields.customPath || c.sectionPath || "";
      expect(reimported.customPath).toBe(expectedPath);
    });
  }
});
