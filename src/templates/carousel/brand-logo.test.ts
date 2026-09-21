import { describe, it, expect } from "vitest";
import type { CarouselContent, CarouselProductCallout } from "@/types";
import { createEmptyCarouselContent, createEmptyProductCallout } from "./schema";
import { generateCarouselHTML } from "./export";
import { getCarouselImages } from "./images";

const CTX = { year: 2026, week: 38, locale: "fr" };

function withCallout(patch: Partial<CarouselProductCallout>): CarouselContent {
  const content = createEmptyCarouselContent();
  content.slides[0] = {
    ...content.slides[0],
    imageUrl: "https://cdn.test/fond.jpg",
    productCallout: { ...createEmptyProductCallout(), enabled: true, showBrandLogo: true, ...patch },
  };
  return content;
}

describe("logo marque du slider", () => {
  it("pose une largeur, 100 px par défaut, à la place de l'ancienne hauteur fixe", () => {
    const html = generateCarouselHTML(withCallout({}), CTX);
    expect(html).toContain('src="logo-puericulture/svg/premaman.svg?$staticlink$"');
    expect(html).toContain('width="100"');
    expect(html).not.toContain('height="32"');
  });

  // Slides enregistrées avant l'ajout du réglage : le slider n'a pas de
  // normalisation de contenu, les nouveaux champs y sont simplement absents.
  it("reste exportable sur une slide ancienne, sans les nouveaux champs", () => {
    const legacy = withCallout({});
    const callout = legacy.slides[0].productCallout;
    delete callout.brandLogoSource;
    delete callout.brandLogoUrl;
    delete callout.brandLogoWidth;
    const html = generateCarouselHTML(legacy, CTX);
    expect(html).toContain('src="logo-puericulture/svg/premaman.svg?$staticlink$"');
    expect(html).toContain('width="100"');
  });

  it("pointe vers le fichier exporté à côté du visuel quand le logo est uploadé", () => {
    const content = withCallout({
      brandLogoSource: "image",
      brandLogoUrl: "https://cdn.test/logo.svg",
      brandLogoWidth: 140,
    });
    const html = generateCarouselHTML(content, CTX);
    expect(html).toContain('src="homepage/2026/wk38/fr/carousel-1-logo.svg?$staticlink$"');
    expect(html).toContain('width="140"');
    expect(html).not.toContain("cdn.test/logo.svg");

    // Le ZIP contient bien ce fichier, au même nom et même semaine.
    const logo = getCarouselImages(content).find((e) => e.baseName === "carousel-1-logo");
    expect(logo).toMatchObject({
      imageUrl: "https://cdn.test/logo.svg",
      imageWeek: null,
      vectorOrPng: true,
    });
  });

  it("n'ajoute rien au ZIP quand le logo est masqué ou désigné par un chemin", () => {
    const hidden = withCallout({
      showBrandLogo: false,
      brandLogoSource: "image",
      brandLogoUrl: "https://cdn.test/logo.png",
    });
    expect(getCarouselImages(hidden).some((e) => e.baseName.endsWith("-logo"))).toBe(false);

    const byPath = withCallout({ brandLogoSource: "path" });
    expect(getCarouselImages(byPath).some((e) => e.baseName.endsWith("-logo"))).toBe(false);
  });
});
