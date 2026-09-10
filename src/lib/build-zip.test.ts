import { describe, it, expect, vi } from "vitest";
import sharp from "sharp";
import type { ImageEntry } from "@/lib/section-images";

const readAsset = vi.fn();
vi.mock("@/lib/storage", () => ({ readAsset: (url: string) => readAsset(url) }));

const { prepareZip, streamZip } = await import("@/lib/build-zip");

const PNG = () =>
  sharp({ create: { width: 4, height: 4, channels: 3, background: "#c00" } }).png().toBuffer();

function img(overrides: Partial<ImageEntry>): ImageEntry {
  return {
    imageUrl: "https://example.test/x.jpg",
    imageWeek: null,
    baseName: "quickaccess-1",
    width: null,
    height: null,
    ...overrides,
  };
}

const GROUP = { folderPrefix: "", year: 2026, week: 36, locale: "fr" };

async function readWebStream(stream: ReadableStream<Uint8Array>): Promise<Buffer> {
  const chunks: Uint8Array[] = [];
  const reader = stream.getReader();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
  }
  return Buffer.concat(chunks);
}

describe("prepareZip", () => {
  it("prépare jpg + webp pour une image qui se lit, et journalise les échecs sans s'arrêter", async () => {
    readAsset.mockImplementation((url: string) =>
      url === "https://example.test/broken.jpg" ? Promise.reject(new Error("boom")) : PNG(),
    );

    const { entries, failed } = await prepareZip([
      {
        ...GROUP,
        images: [
          img({ baseName: "quickaccess-1" }),
          img({ baseName: "quickaccess-2", imageUrl: "https://example.test/broken.jpg" }),
        ],
      },
    ]);

    expect(entries.map((e) => e.name).sort()).toEqual([
      "homepage/2026/wk36/fr/quickaccess-1.jpg",
      "homepage/2026/wk36/fr/quickaccess-1.webp",
    ]);
    expect(failed).toEqual(["homepage/2026/wk36/fr/quickaccess-2"]);
  });

  it("omet le webp pour une image jpgOnly (cat banner)", async () => {
    readAsset.mockResolvedValue(await PNG());
    const { entries } = await prepareZip([{ ...GROUP, images: [img({ jpgOnly: true })] }]);
    expect(entries.map((e) => e.name)).toEqual(["homepage/2026/wk36/fr/quickaccess-1.jpg"]);
  });
});

describe("streamZip", () => {
  it("produit une archive ZIP valide contenant les entrées préparées", async () => {
    const buffer = await readWebStream(
      streamZip({
        entries: [
          { name: "a.jpg", buffer: Buffer.from("contenu-a") },
          { name: "b.mp4", buffer: Buffer.from("contenu-b"), store: true },
        ],
        failed: [],
      }),
    );
    expect(buffer.subarray(0, 4)).toEqual(Buffer.from([0x50, 0x4b, 0x03, 0x04])); // signature ZIP
    expect(buffer.subarray(-22, -18)).toEqual(Buffer.from([0x50, 0x4b, 0x05, 0x06])); // fin de répertoire central
    expect(buffer.includes("a.jpg")).toBe(true);
    expect(buffer.includes("b.mp4")).toBe(true);
    expect(buffer.includes("_IMAGES-MANQUANTES.txt")).toBe(false);
  });

  it("ajoute le rapport des images manquantes quand failed n'est pas vide", async () => {
    const buffer = await readWebStream(
      streamZip({ entries: [], failed: ["homepage/2026/wk36/fr/quickaccess-2"] }),
    );
    expect(buffer.includes("_IMAGES-MANQUANTES.txt")).toBe(true);
  });
});
