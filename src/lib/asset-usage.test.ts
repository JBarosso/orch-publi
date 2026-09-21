import { describe, it, expect } from "vitest";
import { deleteConfirmationMessage } from "./asset-usage";

const NONE = { briefs: [], templates: 0, editoBlocks: 0 };

describe("deleteConfirmationMessage", () => {
  it("garde la question habituelle pour une image utilisée nulle part", () => {
    expect(deleteConfirmationMessage(NONE)).toBe("Supprimer cette image ?");
  });

  it("liste les briefs concernés et leurs sections", () => {
    const message = deleteConfirmationMessage({
      ...NONE,
      briefs: [{ id: "a", label: "Rentrée des classes", sections: ["moodboard (1)", "MEA v2 (2)"] }],
    });
    expect(message).toContain("Cette image est encore utilisée");
    expect(message).toContain("• Rentrée des classes — moodboard (1), MEA v2 (2)");
    expect(message).toContain("image manquante");
  });

  it("signale aussi les templates et les blocs Edito, au singulier comme au pluriel", () => {
    const message = deleteConfirmationMessage({ ...NONE, templates: 1, editoBlocks: 2 });
    expect(message).toContain("• 1 template personnalisé");
    expect(message).toContain("• 2 blocs de la bibliothèque Edito");
  });

  // Une image de base réutilisée partout ne doit pas produire une
  // confirmation qui déborde de l'écran.
  it("abrège une longue liste de briefs", () => {
    const briefs = Array.from({ length: 11 }, (_, i) => ({ id: String(i), label: `Brief ${i}`, sections: [] }));
    const message = deleteConfirmationMessage({ ...NONE, briefs });
    expect(message).toContain("• Brief 7");
    expect(message).not.toContain("• Brief 8");
    expect(message).toContain("• … et 3 autres briefs");
  });
});
