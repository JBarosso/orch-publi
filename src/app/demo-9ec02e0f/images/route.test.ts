import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import sharp from "sharp";
import { createEmptyMacaron } from "@/templates/macarons/schema";
import { DEMO_GALLERY } from "../_demo/config";

const readAsset = vi.fn();
vi.mock("@/lib/storage", () => ({ readAsset: (url: string) => readAsset(url) }));

const { POST } = await import("./route");

function request(body: unknown) {
  return POST(
    new NextRequest("http://localhost/demo-9ec02e0f/images", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
}

const BRIEF = { year: 2026, week: 38, locale: "FR" };
const quickaccess = (imageUrl: string) => ({
  type: "macarons_v2",
  content: { items: [{ ...createEmptyMacaron("a"), imageUrl }] },
});

// Route publique sans login : c'est la liste blanche de la galerie qui empêche
// de faire télécharger et convertir n'importe quelle URL par le serveur.
describe("POST export d'images de la démo", () => {
  beforeEach(() => {
    readAsset.mockReset();
  });

  it("refuse un visuel hors de la galerie de démo, sans rien télécharger", async () => {
    const res = await request({ ...BRIEF, sections: [quickaccess("https://evil.test/x.jpg")] });
    expect(res.status).toBe(400);
    expect(readAsset).not.toHaveBeenCalled();
  });

  it("refuse un brief invalide", async () => {
    expect((await request({ ...BRIEF, locale: "XX", sections: [quickaccess(DEMO_GALLERY[0].url)] })).status).toBe(400);
    expect((await request("pas un brief")).status).toBe(400);
  });

  it("renvoie le ZIP des visuels de la galerie, rangés comme l'export réel", async () => {
    readAsset.mockResolvedValue(
      await sharp({ create: { width: 4, height: 4, channels: 3, background: "#c00" } }).png().toBuffer(),
    );
    const res = await request({ ...BRIEF, sections: [quickaccess(DEMO_GALLERY[0].url)] });
    expect(res.status).toBe(200);
    expect(res.headers.get("content-disposition")).toContain("homepage-2026-wk38-FR.zip");
    const buffer = Buffer.from(await res.arrayBuffer());
    expect(buffer.includes("homepage/2026/wk38/fr/quickaccess-1.jpg")).toBe(true);
  });
});
