import { describe, it, expect } from "vitest";
import type { CatBannerItem } from "@/types";
import { createEmptyCatBannerItem } from "./schema";
import { generateCatBannerItemHTML } from "./export";

const CTX = { year: 2026, week: 40, locale: "fr" };

function banner(over: Partial<CatBannerItem> = {}): CatBannerItem {
  return { ...createEmptyCatBannerItem("b1"), label: "Maxi Cosi", ...over };
}

const hrefOf = (item: CatBannerItem) => generateCatBannerItemHTML(item, CTX).match(/<a href="([^"]*)">/)?.[1];

describe("lien d'une bannière", () => {
  it("URL par défaut : écrite telle quelle", () => {
    expect(createEmptyCatBannerItem("b1").linkType).toBe("url");
    expect(hrefOf(banner({ url: "https://exemple.test/promo" }))).toBe("https://exemple.test/promo");
  });

  it("cgid et cid passent par les macros du CMS", () => {
    expect(hrefOf(banner({ linkType: "cgid", cgid: "puericulture" }))).toBe(
      "$url('Search-Show','cgid','puericulture')$",
    );
    expect(hrefOf(banner({ linkType: "cid", cid: "aide-faq" }))).toBe("$httpsUrl('Page-Show','cid','aide-faq')$");
  });

  // Les bannières créées avant ce choix n'ont pas de linkType.
  it("une bannière d'avant garde son URL", () => {
    const ancienne = { ...banner({ url: "/fr/puericulture" }), linkType: undefined };
    expect(hrefOf(ancienne)).toBe("/fr/puericulture");
  });
});
