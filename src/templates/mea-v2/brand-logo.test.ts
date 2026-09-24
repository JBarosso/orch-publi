import { describe, it, expect } from "vitest";
import type { MeaV2Card, MeaV2Content } from "@/types";
import { createEmptyMeaV2Card, createEmptyMeaV2Content } from "./schema";
import { brandLogoExtension, usesUploadedBrandLogo } from "@/lib/brand-logo";
import { brandLogoBaseName, brandLogoCmsPath } from "./brand-logo";
import { generateMeaV2HTML } from "./export";
import { getMeaV2Images } from "./images";

const CTX = { year: 2026, week: 7, locale: "fr" };

function card(overrides: Partial<MeaV2Card>): MeaV2Card {
  return { ...createEmptyMeaV2Card("c1"), title: "Carte", imageUrl: "https://cdn.test/photo.jpg", ...overrides };
}

function contentWith(first: MeaV2Card): MeaV2Content {
  const base = createEmptyMeaV2Content();
  return { ...base, cards: [first, ...base.cards.slice(1)] };
}

describe("source du logo marque", () => {
  it("reste sur le chemin CMS tant qu'aucune image n'est choisie", () => {
    expect(usesUploadedBrandLogo(card({ brandLogoSource: "image", brandLogoUrl: "" }))).toBe(false);
    expect(usesUploadedBrandLogo(card({ brandLogoSource: "path", brandLogoUrl: "https://x/l.png" }))).toBe(false);
    expect(usesUploadedBrandLogo(card({ brandLogoSource: "image", brandLogoUrl: "https://x/l.png" }))).toBe(true);
  });

  // Régression : buildCmsImagePath remplace le nom par défaut par
  // globalFileName dès que l'image est "globale". Sans suffixe dédié, le logo
  // et la photo de la carte porteraient le même nom et s'écraseraient dans le
  // ZIP comme côté CMS.
  it("ne prend jamais le nom de fichier de la photo de la carte", () => {
    const global = card({ isGlobalImage: true, globalFileName: "promo-ete" });
    expect(brandLogoBaseName(global, "mea-1")).toBe("promo-ete-logo");
    expect(brandLogoCmsPath(global, CTX, "mea-1")).toBe("homepage/2026/wk07/promo-ete-logo");
  });

  it("suit le dossier de la carte ; un chemin personnalisé remplace tout, langue comprise", () => {
    expect(brandLogoCmsPath(card({}), CTX, "mea-1")).toBe("homepage/2026/wk07/fr/mea-1-logo");
    expect(
      brandLogoCmsPath(card({ useCustomPath: true, customPath: "landing/fille" }), CTX, "mea-2"),
    ).toBe("landing/fille/mea-2-logo");
  });
});

describe("export HTML du logo marque", () => {
  it("pose la largeur demandée sur le chemin CMS saisi", () => {
    const html = generateMeaV2HTML(
      contentWith(card({ showBrandLogo: true, brandLogoPath: "logo-puericulture/svg/x.svg", brandLogoWidth: 160 })),
      CTX,
    );
    expect(html).toContain(
      '<img src="logo-puericulture/svg/x.svg?$staticlink$" alt="Logo marque" class="hp-cat-header-mea__marque" width="160">',
    );
  });

  it("pointe vers le PNG exporté quand le logo est une image uploadée", () => {
    const html = generateMeaV2HTML(
      contentWith(
        card({ showBrandLogo: true, brandLogoSource: "image", brandLogoUrl: "https://cdn.test/logo.png" }),
      ),
      CTX,
    );
    expect(html).toContain('src="homepage/2026/wk07/fr/mea-1-logo.png?$staticlink$"');
    // Largeur par défaut, et l'URL de médiathèque ne fuite jamais dans l'export.
    expect(html).toContain('width="100">');
    expect(html).not.toContain("cdn.test/logo.png");
  });

  it("garde la classe d-none quand le logo est masqué", () => {
    const html = generateMeaV2HTML(contentWith(card({ showBrandLogo: false })), CTX);
    expect(html).toContain('class="hp-cat-header-mea__marque d-none"');
  });
});

describe("collecte du logo pour le ZIP", () => {
  it("ajoute le logo uploadé en PNG, au même chemin que celui écrit dans le HTML", () => {
    const content = contentWith(
      card({ showBrandLogo: true, brandLogoSource: "image", brandLogoUrl: "https://cdn.test/logo.png" }),
    );
    const logo = getMeaV2Images(content).find((e) => e.imageUrl === "https://cdn.test/logo.png");
    expect(logo).toMatchObject({ baseName: "mea-1-logo", vectorOrPng: true, width: null, height: null });

    const html = generateMeaV2HTML(content, CTX);
    expect(html).toContain(`${brandLogoCmsPath(content.cards[0], CTX, "mea-1")}.png`);
  });

  // Un SVG uploadé doit rester vectoriel de bout en bout : le HTML et le ZIP
  // doivent pointer la même extension, sinon le CMS cherche un fichier absent.
  it("garde l'extension .svg dans le HTML pour un logo vectoriel", () => {
    const content = contentWith(
      card({ showBrandLogo: true, brandLogoSource: "image", brandLogoUrl: "https://cdn.test/abc.svg" }),
    );
    expect(brandLogoExtension(content.cards[0])).toBe("svg");
    expect(generateMeaV2HTML(content, CTX)).toContain("mea-1-logo.svg?$staticlink$");
  });

  it("retombe sur .png pour tout format matriciel", () => {
    expect(brandLogoExtension(card({ brandLogoUrl: "https://cdn.test/abc.jpg" }))).toBe("png");
    expect(brandLogoExtension(card({ brandLogoUrl: "https://cdn.test/abc.png?v=2" }))).toBe("png");
    expect(brandLogoExtension(card({ brandLogoUrl: "https://cdn.test/abc.svg?v=2" }))).toBe("svg");
  });

  it("n'ajoute rien au ZIP quand le logo est un chemin CMS", () => {
    const content = contentWith(card({ showBrandLogo: true, brandLogoPath: "logo-puericulture/svg/x.svg" }));
    expect(getMeaV2Images(content).every((e) => !e.vectorOrPng)).toBe(true);
  });
});
