import { describe, it, expect } from "vitest";
import { TEMPLATE_UI, mergeQuickaccessImport } from "@/templates/registry-ui";

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

  it("moodboard : ne touche qu'à l'élément image visé, laisse les autres types intacts", () => {
    const content = {
      elements: [
        { id: "a", type: "image", imageUrl: "" },
        { id: "b", type: "shape", color: "#fff" },
      ],
    };
    expect(TEMPLATE_UI.moodboard.setImage!(content, "a", URL)).toEqual({
      elements: [
        { id: "a", type: "image", imageUrl: URL },
        { id: "b", type: "shape", color: "#fff" },
      ],
    });
  });
});

describe("mergeQuickaccessImport", () => {
  // Régression : l'import CMS affichait « 8 macarons importés » sans que rien
  // n'apparaisse dans la section. `MacaronsEditor.handleImport` appelait
  // `onChange(items)` puis `onSectionCustomPathChange(customPath)` : les deux
  // reconstruisaient le contenu à partir du même `content` reçu par l'éditeur
  // à ce rendu (comme `withItems`/`setImage` ci-dessus), inchangé entre les
  // deux appels synchrones (aucun rendu entre les deux) — le second écrasait
  // le premier avec une base ne contenant pas encore les items importés.
  // Fixé en un seul appel `onImport(items, customPath)`, qui passe par cette
  // fonction — cf. MacaronsEditorProps.onImport pour le détail du mécanisme.
  it("pose les items importés et le chemin de section ensemble", () => {
    const content = { customPath: "ancien-chemin", items: [{ id: "old" }] };
    const imported = [{ id: "a", label: "Ensembles" }, { id: "b", label: "Sweats" }];
    expect(mergeQuickaccessImport(content, imported as never, "hp-cat-lvl2/bbf", "cat_lvl2")).toEqual({
      items: imported,
      customPath: "hp-cat-lvl2/bbf",
      placement: "cat_lvl2",
    });
  });

  // Régression : l'emplacement détecté à l'import était perdu, et l'export
  // réécrivait les classes de la page d'accueil sur une section venue d'une
  // page catégorie niveau 2 — qui se retrouvait donc sans style.
  it("conserve l'emplacement détecté dans le HTML importé", () => {
    const withLvl2 = mergeQuickaccessImport({ placement: "cat_lvl2" }, [] as never, "", "cat_lvl2");
    expect(withLvl2.placement).toBe("cat_lvl2");
    // Un import de page d'accueil sur une section auparavant en lvl2 la ramène
    // bien à "homepage" plutôt que de garder l'ancienne valeur.
    expect(mergeQuickaccessImport(withLvl2, [] as never, "", "homepage").placement).toBe("homepage");
  });

  it("fonctionne même sans contenu existant (première section)", () => {
    expect(mergeQuickaccessImport(null, [] as never, "")).toEqual({
      items: [],
      customPath: "",
      placement: "homepage",
    });
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
