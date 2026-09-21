import { describe, it, expect } from "vitest";
import type { CmsPage } from "@/types";
import { cmsAssetColumnLabel, hasCmsAsset, resolveCmsAsset } from "./cms-asset";

const PAGES: CmsPage[] = [
  { id: "hp", name: "HP", assets: { mea_v2: "hp-mea-v2", macarons_v2: "hp-quickaccess" } },
  { id: "bebe", name: "HP cat bébé", assets: { mea_v2: "bebe-mea-v2" } },
];

describe("resolveCmsAsset", () => {
  it("déduit l'asset de la page choisie et du type de la section", () => {
    const hp = resolveCmsAsset({ type: "mea_v2", cmsPageId: "hp", cmsAssetId: "" }, PAGES);
    expect(hp).toMatchObject({ assetId: "hp-mea-v2", origin: "page" });
    // Même type, autre page : autre asset.
    const bebe = resolveCmsAsset({ type: "mea_v2", cmsPageId: "bebe", cmsAssetId: "" }, PAGES);
    expect(bebe).toMatchObject({ assetId: "bebe-mea-v2", origin: "page" });
  });

  it("donne la priorité à l'identifiant saisi sur la section", () => {
    const res = resolveCmsAsset({ type: "mea_v2", cmsPageId: "hp", cmsAssetId: " exception-42 " }, PAGES);
    expect(res).toMatchObject({ assetId: "exception-42", origin: "manual" });
  });

  it("ne renvoie rien sans page, ou quand la page n'a rien pour ce type", () => {
    expect(resolveCmsAsset({ type: "mea_v2", cmsPageId: null, cmsAssetId: "" }, PAGES)).toMatchObject({
      assetId: "",
      origin: "none",
      page: null,
    });
    // Page renseignée, mais pas de quickaccess défini sur la HP cat bébé.
    expect(
      resolveCmsAsset({ type: "macarons_v2", cmsPageId: "bebe", cmsAssetId: "" }, PAGES),
    ).toMatchObject({ assetId: "", origin: "none", page: { name: "HP cat bébé" } });
  });

  // Page supprimée de l'onglet : la base remet la référence à null, mais une
  // section chargée avant la suppression peut encore porter l'ancien id.
  it("tolère une page qui n'existe plus", () => {
    expect(resolveCmsAsset({ type: "mea_v2", cmsPageId: "disparue", cmsAssetId: "" }, PAGES)).toMatchObject({
      origin: "none",
      page: null,
    });
  });
});

describe("hasCmsAsset", () => {
  it("écarte les sections qui n'ont pas de code à coller", () => {
    expect(hasCmsAsset("mea_v2")).toBe(true);
    expect(hasCmsAsset("moodboard")).toBe(false);
    expect(hasCmsAsset("img_sous_menu")).toBe(false);
    expect(hasCmsAsset("miniature_offre")).toBe(false);
  });

  // Une seule colonne « Macaron » dans l'onglet, qui désigne le macaron v2.
  it("ne garde que le macaron v2, présenté comme « Macaron »", () => {
    expect(hasCmsAsset("macarons_v2")).toBe(true);
    expect(hasCmsAsset("macarons")).toBe(false);
    expect(cmsAssetColumnLabel("macarons_v2")).toBe("Macaron");
  });
});
