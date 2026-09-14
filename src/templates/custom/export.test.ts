import { describe, it, expect } from "vitest";
import { generateCustomHTML, generatePreviewHTML } from "./export";
import { createEmptyBlock, createEmptyCustomContent } from "./schema";
import type { CustomContent } from "@/types";

const CTX = { year: 2026, week: 38, locale: "fr" };

function withButton(overrides: Partial<ReturnType<typeof createEmptyBlock>>): CustomContent {
  return { ...createEmptyCustomContent(), blocks: [{ ...createEmptyBlock("button"), text: "Voir", ...overrides }] };
}

describe("bouton d'une section personnalisée — seul template dont le lien de preview est actif", () => {
  // Les autres templates neutralisent tout clic en preview car leurs liens ne
  // sont que des macros CMS ($url(...)$), inertes hors du vrai CMS. Une
  // section personnalisée accepte une vraie URL libre : le clic doit marcher,
  // mais ne jamais quitter l'éditeur — d'où le target="_blank" obligatoire.
  it("preview : garde le vrai lien, mais toujours en nouvel onglet", () => {
    const content = withButton({ linkType: "url", link: "https://example.com/promo" });
    const html = generatePreviewHTML(content);
    expect(html).toContain('href="https://example.com/promo"');
    expect(html).toContain('target="_blank"');
    expect(html).toContain('rel="noopener noreferrer"');
  });

  it("preview : plus de clic neutralisé (pas de preventDefault sur les liens)", () => {
    expect(generatePreviewHTML(withButton({ linkType: "url", link: "https://example.com" }))).not.toContain(
      "preventDefault",
    );
  });

  it("export CMS : même lien, mais jamais en target=_blank (comportement inchangé)", () => {
    const html = generateCustomHTML(withButton({ linkType: "url", link: "https://example.com/promo" }), CTX);
    expect(html).toContain('href="https://example.com/promo"');
    expect(html).not.toContain("target=");
  });

  it("preview : un lien cgid/cid produit aussi la vraie macro, toujours en nouvel onglet", () => {
    const html = generatePreviewHTML(withButton({ linkType: "cgid", cgid: "outlet" }));
    expect(html).toContain(`href="$url('Search-Show','cgid','outlet')$"`);
    expect(html).toContain('target="_blank"');
  });
});
