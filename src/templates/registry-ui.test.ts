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
