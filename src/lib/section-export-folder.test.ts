import { describe, it, expect } from "vitest";
import { sectionExportFolders, slugifySectionTitle } from "./section-export-folder";
import { getSectionImages, generateSectionHTML } from "@/templates/registry";

const section = (id: string, type: string, title = "") => ({ id, type, title });

describe("slugifySectionTitle", () => {
  it("réduit un titre à un segment de chemin", () => {
    expect(slugifySectionTitle("Promo Puériculture !")).toBe("promo-puericulture");
    expect(slugifySectionTitle("  MEA bébé  ")).toBe("mea-bebe");
  });

  it("ne rend rien d'un titre sans lettre ni chiffre", () => {
    expect(slugifySectionTitle("—  !")).toBe("");
    expect(slugifySectionTitle("")).toBe("");
    expect(slugifySectionTitle(undefined)).toBe("");
  });
});

describe("sectionExportFolders", () => {
  it("laisse la première section de chaque type à son chemin historique", () => {
    const folders = sectionExportFolders([
      section("a", "macarons_v2", "Macarons"),
      section("b", "mea_v2", "MEA"),
    ]);
    expect(folders.get("a")).toBe("");
    expect(folders.get("b")).toBe("");
  });

  it("donne un sous-dossier aux sections suivantes du même type", () => {
    const folders = sectionExportFolders([
      section("a", "macarons_v2", "Macarons"),
      section("b", "macarons_v2", "Promo Puériculture"),
      section("c", "mea_v2", "MEA"),
      section("d", "mea_v2", "MEA bébé"),
    ]);
    expect(folders.get("a")).toBe("");
    expect(folders.get("b")).toBe("promo-puericulture");
    expect(folders.get("c")).toBe("");
    expect(folders.get("d")).toBe("mea-bebe");
  });

  it("retombe sur le rang quand le titre ne donne pas de nom", () => {
    const folders = sectionExportFolders([
      section("a", "macarons_v2", "Macarons"),
      section("b", "macarons_v2", ""),
    ]);
    expect(folders.get("b")).toBe("section-2");
  });

  // Deux sections homonymes ramèneraient le problème qu'on corrige.
  it("distingue deux sections portant le même titre", () => {
    const folders = sectionExportFolders([
      section("a", "macarons_v2", "Macarons"),
      section("b", "macarons_v2", "Bébé"),
      section("c", "macarons_v2", "Bébé"),
    ]);
    expect(folders.get("b")).toBe("bebe");
    expect(folders.get("c")).toBe("bebe-3");
  });
});

// Le fichier zippé et le <img src> du HTML doivent tomber au même endroit :
// c'est leur divergence qui casserait l'intégration CMS.
describe("cohérence ZIP / HTML", () => {
  const items = [
    { id: "1", label: "Bébé", imageUrl: "https://blob.test/a.jpg", imageWeek: null, visible: true },
  ];

  it("place les images de la 2e section dans son sous-dossier, des deux côtés", () => {
    const [image] = getSectionImages("macarons_v2", { items }, "promo-puericulture");
    expect(image.sectionFolder).toBe("promo-puericulture");

    const html = generateSectionHTML("macarons_v2", { items }, {
      year: 2026,
      week: 40,
      locale: "fr",
      sectionFolder: "promo-puericulture",
    });
    expect(html).toContain("homepage/2026/wk40/fr/promo-puericulture/quickaccess-1.jpg");
  });

  // Un chemin personnalisé désigne déjà un emplacement précis : le
  // sous-dossier automatique n'a plus lieu d'être, et la langue disparaît.
  it("s'efface devant un chemin personnalisé de section", () => {
    const [image] = getSectionImages("macarons_v2", { items, customPath: "hp-cat-lvl2/bbf" }, "promo-puericulture");
    expect(image.customFolder).toBe("hp-cat-lvl2/bbf");

    const html = generateSectionHTML("macarons_v2", { items, customPath: "hp-cat-lvl2/bbf" }, {
      year: 2026,
      week: 40,
      locale: "fr",
      sectionFolder: "promo-puericulture",
    });
    expect(html).toContain("hp-cat-lvl2/bbf/quickaccess-1.jpg");
    expect(html).not.toContain("promo-puericulture");
  });

  it("laisse la première section au chemin historique", () => {
    const [image] = getSectionImages("macarons_v2", { items });
    expect(image.sectionFolder).toBeUndefined();

    const html = generateSectionHTML("macarons_v2", { items }, { year: 2026, week: 40, locale: "fr" });
    expect(html).toContain("homepage/2026/wk40/fr/quickaccess-1.jpg");
  });
});
