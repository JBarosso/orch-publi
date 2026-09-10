import { describe, it, expect, vi } from "vitest";

// retention.ts ouvre la connexion Neon à l'import ; seule la fonction pure est testée.
vi.mock("@/lib/db", () => ({ db: {} }));

import { extractReferencedAssetUrls } from "@/lib/retention";

const BLOB = "https://store.public.blob.vercel-storage.com";

describe("extractReferencedAssetUrls", () => {
  // Régression : l'ancienne liste de champs par template ignorait ces deux
  // templates, et la purge supprimait leurs images encore utilisées.
  it("voit les images et la vidéo d'une diapositive de carousel", () => {
    const content = {
      slides: [
        {
          imageUrl: `${BLOB}/fond.jpg`,
          titleImageUrl: `${BLOB}/titre.png`,
          mediaType: "video",
          videoUrl: `${BLOB}/clip.mp4`,
        },
      ],
    };
    expect(extractReferencedAssetUrls(content)).toEqual([
      `${BLOB}/fond.jpg`,
      `${BLOB}/titre.png`,
      `${BLOB}/clip.mp4`,
    ]);
  });

  it("voit les deux visuels d'une cat banner", () => {
    const content = {
      items: [{ desktopImageUrl: `${BLOB}/desk.jpg`, mobileImageUrl: `${BLOB}/mob.jpg` }],
    };
    expect(extractReferencedAssetUrls(content)).toEqual([`${BLOB}/desk.jpg`, `${BLOB}/mob.jpg`]);
  });

  it("voit une URL glissée dans du HTML libre, et les chemins locaux /uploads", () => {
    const blocks = [
      { text: `<p><img src="${BLOB}/inline.webp"></p>` },
      { imageUrl: "/uploads/abc.png" },
    ];
    expect(extractReferencedAssetUrls(blocks)).toEqual([`${BLOB}/inline.webp`, "/uploads/abc.png"]);
  });

  it("ne renvoie rien pour un contenu vide", () => {
    expect(extractReferencedAssetUrls(null)).toEqual([]);
    expect(extractReferencedAssetUrls({ items: [{ imageUrl: "" }] })).toEqual([]);
  });
});
