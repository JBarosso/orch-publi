import { describe, it, expect, vi } from "vitest";
import { NextRequest } from "next/server";
import { createEmptyMacaron } from "@/templates/macarons/schema";

const translatePastedContent = vi.fn();
vi.mock("@/lib/translations", () => ({
  translatePastedContent: (...args: unknown[]) => translatePastedContent(...args),
}));

const { POST } = await import("./route");

const post = (body: unknown) =>
  POST(new NextRequest("http://test/api/sections/paste-item", { method: "POST", body: JSON.stringify(body) }));

const sourceContent = { items: [1, 2, 3].map((n) => createEmptyMacaron(`id-${n}`)) };

describe("POST /api/sections/paste-item", () => {
  it("fige l'item sur sa semaine et sa position d'origine, avec un nouvel id", async () => {
    const res = await post({
      type: "macarons_v2",
      sourceType: "macarons",
      sourceContent,
      itemId: "id-3",
      from: { week: 32, locale: "FR" },
      to: { week: 40, locale: "FR" },
    });
    const { item, translation } = await res.json();
    expect(res.status).toBe(200);
    // 3e de sa section d'origine : figé sur quickaccess-3 de la semaine 32.
    expect([item.imageWeek, item.exportPosition]).toEqual([32, 3]);
    expect(item.id).not.toBe("id-3");
    expect(translation).toBeNull();
    expect(translatePastedContent).not.toHaveBeenCalled();
  });

  it("refuse de coller dans une section d'un autre genre", async () => {
    const res = await post({
      type: "edito",
      sourceType: "macarons_v2",
      sourceContent,
      itemId: "id-1",
      from: { week: 32, locale: "FR" },
      to: { week: 32, locale: "FR" },
    });
    expect(res.status).toBe(400);
  });

  it("ne traduit que si c'est demandé et que la langue change", async () => {
    translatePastedContent.mockResolvedValue({
      content: { items: [{ ...sourceContent.items[0], label: "camisetas" }] },
      stats: { translated: 1, missing: 0, ambiguous: 0 },
    });
    const res = await post({
      type: "macarons_v2",
      sourceType: "macarons_v2",
      sourceContent,
      itemId: "id-1",
      from: { week: 32, locale: "FR" },
      to: { week: 32, locale: "ES" },
      translate: true,
    });
    const { item, translation } = await res.json();
    expect(item.label).toBe("camisetas");
    expect(translation).toEqual({ translated: 1, missing: 0, ambiguous: 0 });
    // Seul l'item copié part à la traduction.
    expect(translatePastedContent.mock.calls[0][1].items).toHaveLength(1);
  });
});
