import { describe, it, expect } from "vitest";
import { TEMPLATE_UI } from "@/templates/registry-ui";

const URL = "https://example.test/new.jpg";

describe("TEMPLATE_UI setImage", () => {
  // Régression : l'ancienne cascade de page.tsx remplaçait content par
  // { items }, ce qui effaçait le chemin custom de la section.
  it("macarons v2 : met à jour l'item visé sans perdre le chemin custom de la section", () => {
    const content = {
      customPath: "landing-pages/fille",
      items: [
        { id: "a", imageUrl: "old-a", imageWeek: 30, exportPosition: 2 },
        { id: "b", imageUrl: "old-b", imageWeek: 30, exportPosition: 3 },
      ],
    };
    expect(TEMPLATE_UI.macarons_v2.setImage!(content, "b", URL)).toEqual({
      customPath: "landing-pages/fille",
      items: [
        { id: "a", imageUrl: "old-a", imageWeek: 30, exportPosition: 2 },
        { id: "b", imageUrl: URL, imageWeek: null, exportPosition: null },
      ],
    });
  });

  it("carousel : distingue le visuel de fond du titre en image", () => {
    const setImage = TEMPLATE_UI.carousel.setImage!;
    const content = {
      slides: [
        { imageUrl: "", titleImageUrl: "" },
        { imageUrl: "", titleImageUrl: "" },
      ],
    };
    expect(setImage(setImage(content, "slide-0", "fond"), "title-1", "titre")).toMatchObject({
      slides: [
        { imageUrl: "fond", titleImageUrl: "" },
        { imageUrl: "", titleImageUrl: "titre", titleImageWeek: null },
      ],
    });
  });

  it("cat banner : le suffixe choisit le visuel desktop ou mobile", () => {
    const content = { items: [{ id: "x", desktopImageUrl: "", mobileImageUrl: "" }] };
    expect(TEMPLATE_UI.cat_banner.setImage!(content, "x:mobile", URL)).toMatchObject({
      items: [{ desktopImageUrl: "", mobileImageUrl: URL }],
    });
  });

  it("MEA v2 : carte focus et cartes numérotées", () => {
    const setImage = TEMPLATE_UI.mea_v2.setImage!;
    const content = { focus: { imageUrl: "" }, cards: [{ imageUrl: "" }, { imageUrl: "" }] };
    expect(setImage(content, "card-1", URL)).toMatchObject({
      focus: { imageUrl: "" },
      cards: [{ imageUrl: "" }, { imageUrl: URL }],
    });
    expect(setImage(content, "focus", URL)).toMatchObject({ focus: { imageUrl: URL } });
  });
});

describe("TEMPLATE_UI labelFor", () => {
  // Régression : content en {cards, focus} (pas {items}) — la recherche
  // générique par id d'item ne le voyait pas, contrairement aux macarons, où
  // le même geste (label déjà saisi -> pré-rempli à l'upload) marchait déjà.
  it("MEA v2 : titre de la carte visée, ou de la carte focus", () => {
    const labelFor = TEMPLATE_UI.mea_v2.labelFor!;
    const content = { focus: { title: "Focus" }, cards: [{ title: "Carte 1" }, { title: "Carte 2" }] };
    expect(labelFor(content, "card-1")).toBe("Carte 2");
    expect(labelFor(content, "focus")).toBe("Focus");
  });

  it("macarons v2 : label de l'item visé, comme MEA v2 pour ses cartes", () => {
    const content = { items: [{ id: "a", label: "Tuile A" }] };
    expect(TEMPLATE_UI.macarons_v2.labelFor!(content, "a")).toBe("Tuile A");
  });

  it("mea (v1) : titre de l'item, pas de champ label", () => {
    const content = { items: [{ id: "a", title: "Item A" }] };
    expect(TEMPLATE_UI.mea.labelFor!(content, "a")).toBe("Item A");
  });

  it("cat banner : le suffixe ne fait pas manquer l'item", () => {
    const content = { items: [{ id: "x", label: "Bannière X" }] };
    expect(TEMPLATE_UI.cat_banner.labelFor!(content, "x:mobile")).toBe("Bannière X");
  });
});

describe("TEMPLATE_UI video", () => {
  it("carousel : la vidéo va sur la diapositive visée, la vignette sur son visuel de fond", () => {
    const video = TEMPLATE_UI.carousel.video!;
    const content = { slides: [{ mediaType: "image" }, { mediaType: "image" }] };
    expect(video.set(content, "1", URL)).toMatchObject({
      slides: [{ mediaType: "image" }, { mediaType: "video", videoUrl: URL }],
    });
    expect(video.poster("1")).toEqual({ target: "slide-1", assetType: "carousel" });
  });
});
