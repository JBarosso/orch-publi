import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import sharp from "sharp";
import type { ImageEntry } from "@/lib/section-images";

// Isole la route de la vraie base et du vrai registre de templates (chargerait
// tous les templates pour rien) : seul le câblage streaming ajouté ici est visé.
const SECTION = { id: "s1", briefId: "b1", type: "macarons_v2", content: {} };
const BRIEF = { id: "b1", year: 2026, week: 36, locale: "fr" };

function chain(rows: unknown[]) {
  return { from: () => ({ where: () => Promise.resolve(rows) }) };
}

const select = vi.fn();
vi.mock("@/lib/db", () => ({ db: { select: (...args: unknown[]) => select(...args) } }));
vi.mock("@/lib/schema", () => ({ briefs: {}, briefSections: {} }));

const getSectionImages = vi.fn<(...args: unknown[]) => ImageEntry[]>();
vi.mock("@/templates/registry", () => ({ getSectionImages: (...args: unknown[]) => getSectionImages(...args) }));

const readAsset = vi.fn();
vi.mock("@/lib/storage", () => ({ readAsset: (url: string) => readAsset(url) }));

const { GET } = await import("./route");

function img(overrides: Partial<ImageEntry> = {}): ImageEntry {
  return {
    imageUrl: "https://example.test/a.jpg",
    imageWeek: null,
    baseName: "quickaccess-1",
    width: null,
    height: null,
    ...overrides,
  };
}

async function readAll(stream: ReadableStream<Uint8Array>): Promise<Buffer> {
  const chunks: Uint8Array[] = [];
  const reader = stream.getReader();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
  }
  return Buffer.concat(chunks);
}

// La route (src/app/api/export/images/route.ts) était couverte par des tests
// manuels uniquement. Ajoutés en préparant le streaming du ZIP (elle ne
// renvoyait jusqu'ici qu'un Buffer entier, plafonné à 4,5 Mo par réponse sur
// Vercel) pour verrouiller son câblage : 404, 502 « tout a échoué », et
// surtout que le succès renvoie un vrai corps de flux, pas un Buffer.
describe("GET /api/export/images", () => {
  beforeEach(() => {
    select.mockReset();
    getSectionImages.mockReset();
    readAsset.mockReset();
  });

  it("404 si la section n'existe pas", async () => {
    select.mockReturnValueOnce(chain([]));
    const res = await GET(new NextRequest("http://localhost/api/export/images?sectionId=s1"));
    expect(res.status).toBe(404);
  });

  it("502 sans buffer si toutes les images échouent — décidé avant tout octet envoyé", async () => {
    select.mockReturnValueOnce(chain([SECTION])).mockReturnValueOnce(chain([BRIEF]));
    getSectionImages.mockReturnValue([img()]);
    readAsset.mockRejectedValue(new Error("stockage indisponible"));

    const res = await GET(new NextRequest("http://localhost/api/export/images?sectionId=s1"));
    expect(res.status).toBe(502);
    expect((await res.json()).failed).toEqual(["homepage/2026/wk36/fr/quickaccess-1"]);
  });

  it("succès : corps en flux (pas Content-Length), zip valide, en-tête d'export partiel si besoin", async () => {
    select.mockReturnValueOnce(chain([SECTION])).mockReturnValueOnce(chain([BRIEF]));
    getSectionImages.mockReturnValue([
      img({ baseName: "quickaccess-1" }),
      img({ baseName: "quickaccess-2", imageUrl: "https://example.test/broken.jpg" }),
    ]);
    readAsset.mockImplementation((url: string) =>
      url.includes("broken")
        ? Promise.reject(new Error("boom"))
        : sharp({ create: { width: 4, height: 4, channels: 3, background: "#c00" } }).png().toBuffer(),
    );

    const res = await GET(new NextRequest("http://localhost/api/export/images?sectionId=s1"));

    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("application/zip");
    expect(res.headers.get("content-disposition")).toContain("homepage-2026-wk36-fr.zip");
    // Pas de longueur connue à l'avance : c'est ce qui permet de dépasser 4,5 Mo sur Vercel.
    expect(res.headers.get("content-length")).toBeNull();
    expect(res.headers.get("x-export-images-manquantes")).toBe("1");

    expect(res.body).toBeInstanceOf(ReadableStream);
    const buffer = await readAll(res.body as ReadableStream<Uint8Array>);
    expect(buffer.subarray(0, 4)).toEqual(Buffer.from([0x50, 0x4b, 0x03, 0x04]));
    expect(buffer.includes("quickaccess-1.jpg")).toBe(true);
    expect(buffer.includes("_IMAGES-MANQUANTES.txt")).toBe(true);
  });
});
