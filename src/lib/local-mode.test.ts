import { describe, it, expect } from "vitest";
import { capDimensions, fitBox, wholeBox } from "./image-geometry";
import { uploadOutputFormat } from "./image-pipeline";
import {
  contentHasLocalImages,
  filterLocalAssets,
  isLocalImageUrl,
  localAssetFilterOptions,
  localImageIdFromUrl,
  localImageUrl,
  type LocalImageRecord,
} from "./local-images";
import { collectBriefImages } from "./brief-images";
import { MISSING_IMAGES_FILE, missingImagesReport, zipFolderFor } from "./export-paths";
import type { ImageEntry } from "./section-images";

describe("géométrie du traitement navigateur (calquée sur sharp)", () => {
  it("cover : recadre au centre, sans bande", () => {
    // Photo 1920×1080 dans un macaron 200×300 : on garde une colonne centrale.
    expect(fitBox(1920, 1080, 200, 300, "cover")).toEqual({ sx: 600, sy: 0, sw: 720, sh: 1080, dx: 0, dy: 0, dw: 200, dh: 300 });
  });

  it("contain : toute l'image, centrée sur le fond", () => {
    expect(fitBox(1000, 500, 600, 400, "contain")).toEqual({ sx: 0, sy: 0, sw: 1000, sh: 500, dx: 0, dy: 50, dw: 600, dh: 300 });
  });

  it("plafond des uploads libres, sans jamais agrandir", () => {
    expect(capDimensions(6000, 4000, 2400)).toEqual({ w: 2400, h: 1600 });
    expect(capDimensions(800, 600, 2400)).toEqual({ w: 800, h: 600 });
    expect(wholeBox(800, 600, 400, 300)).toMatchObject({ sw: 800, sh: 600, dw: 400, dh: 300 });
  });

  it("format de sortie : celui du type, ou celui de la source (AVIF → PNG)", () => {
    expect(uploadOutputFormat({ outputFormat: "jpeg" }, "image/png")).toBe("jpeg");
    expect(uploadOutputFormat({ outputFormat: "source" }, "image/jpeg")).toBe("jpeg");
    expect(uploadOutputFormat({ outputFormat: "source" }, "image/webp")).toBe("webp");
    expect(uploadOutputFormat({ outputFormat: "source" }, "image/avif")).toBe("png");
  });
});

describe("adresses des images locales", () => {
  it("se reconnaissent et se relisent", () => {
    const url = localImageUrl("abc-123", "jpg");
    expect(url).toBe("/local-images/abc-123.jpg");
    expect(isLocalImageUrl(url)).toBe(true);
    expect(isLocalImageUrl("https://store.public.blob.vercel-storage.com/x.jpg")).toBe(false);
    expect(isLocalImageUrl(undefined)).toBe(false);
    expect(localImageIdFromUrl(url)).toBe("abc-123");
  });

  it("repère un contenu de section qui en contient", () => {
    expect(contentHasLocalImages({ items: [{ imageUrl: "/local-images/a.jpg" }] })).toBe(true);
    expect(contentHasLocalImages({ items: [{ imageUrl: "https://x/a.jpg" }] })).toBe(false);
    expect(contentHasLocalImages(null)).toBe(false);
  });
});

describe("médiathèque du poste", () => {
  const record = (over: Partial<LocalImageRecord>): LocalImageRecord => ({
    id: "id",
    url: "/local-images/id.jpg",
    blob: new Blob(),
    mimeType: "image/jpeg",
    label: "Pyjamas",
    type: "macaron_v2",
    week: 40,
    year: 2026,
    originUrl: null,
    createdAt: 1,
    ...over,
  });
  const records = [
    record({ id: "a", label: "Pyjamas", week: 40, createdAt: 1 }),
    record({ id: "b", label: "Sweats", week: 41, createdAt: 2, type: "mea_v2" }),
  ];

  it("applique les mêmes filtres que la médiathèque du serveur, plus récentes d'abord", () => {
    expect(filterLocalAssets(records, {}).map((a) => a.id)).toEqual(["b", "a"]);
    expect(filterLocalAssets(records, { search: "pyj" }).map((a) => a.id)).toEqual(["a"]);
    expect(filterLocalAssets(records, { week: "41" }).map((a) => a.id)).toEqual(["b"]);
    expect(filterLocalAssets(records, { type: "macaron_v2" }).map((a) => a.id)).toEqual(["a"]);
  });

  it("propose les valeurs de filtre présentes", () => {
    expect(localAssetFilterOptions(records)).toEqual({ years: [2026], weeks: [40, 41], types: ["macaron_v2", "mea_v2"] });
  });
});

describe("ZIP du navigateur : mêmes images et mêmes chemins que celui du serveur", () => {
  const macaron = (imageUrl: string) => ({ id: imageUrl, label: "x", imageUrl, imageWeek: null, visible: true });
  const sections = [
    { id: "s2", type: "macarons_v2", title: "Promo", order: 2, visible: true, content: { items: [macaron("/local-images/b.jpg")] } },
    { id: "s1", type: "macarons_v2", title: "Macarons", order: 1, visible: true, content: { items: [macaron("/local-images/a.jpg")] } },
    { id: "s3", type: "macarons_v2", title: "Masquée", order: 3, visible: false, content: { items: [macaron("/local-images/c.jpg")] } },
  ];

  it("suit l'ordre d'affichage et ignore les sections non exportées", () => {
    const images = collectBriefImages(sections);
    expect(images.map((i) => i.imageUrl)).toEqual(["/local-images/a.jpg", "/local-images/b.jpg"]);
    // La 2e section du même type a son sous-dossier.
    expect(images.map((i) => i.sectionFolder)).toEqual([undefined, "promo"]);
  });

  it("exporte une section seule même si son export est coupé", () => {
    expect(collectBriefImages(sections, "s3").map((i) => i.imageUrl)).toEqual(["/local-images/c.jpg"]);
  });

  it("range chaque fichier au chemin CMS attendu par le HTML", () => {
    const ctx = { folderPrefix: "", year: 2026, week: 40, locale: "FR" };
    const img = (over: Partial<ImageEntry>): ImageEntry => ({ imageUrl: "", imageWeek: null, baseName: "x", width: null, height: null, ...over });
    expect(zipFolderFor(img({}), ctx)).toBe("homepage/2026/wk40/fr");
    expect(zipFolderFor(img({ sectionFolder: "promo" }), ctx)).toBe("homepage/2026/wk40/fr/promo");
    expect(zipFolderFor(img({ customFolder: "hp-cat-lvl2/bbf" }), ctx)).toBe("hp-cat-lvl2/bbf");
    expect(zipFolderFor(img({ noLocale: true, imageWeek: 38 }), ctx)).toBe("homepage/2026/wk38");
  });

  it("liste les images manquantes dans le rapport de l'archive", () => {
    expect(MISSING_IMAGES_FILE).toBe("_IMAGES-MANQUANTES.txt");
    expect(missingImagesReport(["homepage/2026/wk40/fr/mea-5"])).toContain("  - homepage/2026/wk40/fr/mea-5");
  });
});
