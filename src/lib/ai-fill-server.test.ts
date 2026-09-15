import { describe, it, expect } from "vitest";
import sharp from "sharp";
import { compositeFill } from "./ai-fill-server";
import { computeBlankBands } from "./ai-fill";

// Reconstitue ce que produit le recadrage client : l'image d'origine centrée
// sur un fond blanc, avec des bandes vides à gauche et à droite.
async function croppedWithWhiteBands(width: number, height: number, band: number) {
  return sharp({
    create: { width, height, channels: 3, background: "#ffffff" },
  })
    .composite([
      {
        input: {
          create: {
            width: width - band * 2,
            height,
            channels: 3,
            background: "#ff0000",
          },
        },
        left: band,
        top: 0,
      },
    ])
    .jpeg()
    .toBuffer();
}

async function pixelAt(image: Buffer, x: number, y: number) {
  const { data } = await sharp(image)
    .extract({ left: x, top: y, width: 1, height: 1 })
    .raw()
    .toBuffer({ resolveWithObject: true });
  return { r: data[0], g: data[1], b: data[2] };
}

describe("compositeFill", () => {
  // Le point critique : les bandes viennent du rendu IA, le centre reste
  // exactement l'image d'origine, et surtout il ne doit rester nulle part la
  // moindre trace du blanc de remplissage — un liseré d'un pixel à la jonction
  // serait le défaut le plus visible sur une photo produit.
  it("remplace les bandes blanches par le rendu IA sans laisser de liseré", async () => {
    const width = 1000;
    const height = 600;
    const band = 200;
    const original = await croppedWithWhiteBands(width, height, band);
    // Le modèle ne rend que dans ses propres formats : ici le paysage 3:2,
    // volontairement différent des 1000x600 attendus.
    const generated = await sharp({
      create: { width: 1536, height: 1024, channels: 3, background: "#0000ff" },
    })
      .png()
      .toBuffer();

    const bands = computeBlankBands(
      { x: -band, y: 0, width, height },
      width - band * 2,
      height,
      width,
      height,
    );
    expect(bands).toMatchObject({ left: band, right: band, top: 0, bottom: 0 });

    const merged = await compositeFill(original, generated, bands, width, height);
    expect(await sharp(merged).metadata()).toMatchObject({ width, height });

    // Bandes : bleu (généré). Mesuré à quelques pixels de la jonction, la
    // compression JPEG mélangeant les teintes juste à la frontière.
    expect((await pixelAt(merged, 5, 300)).b).toBeGreaterThan(200);
    expect((await pixelAt(merged, band - 5, 300)).b).toBeGreaterThan(200);
    expect((await pixelAt(merged, width - 5, 300)).b).toBeGreaterThan(200);

    // Centre : l'image d'origine, intacte.
    const center = await pixelAt(merged, width / 2, height / 2);
    expect(center.r).toBeGreaterThan(200);
    expect(center.b).toBeLessThan(60);

    // Le contrôle qui compte : pas un seul pixel blanchâtre sur toute la
    // largeur. Ni le rouge ni le bleu ni leurs mélanges n'ont les trois
    // canaux hauts en même temps — seul un reste de fond de remplissage
    // le serait, y compris sur un unique pixel de décalage.
    const { data } = await sharp(merged)
      .extract({ left: 0, top: height / 2, width, height: 1 })
      .raw()
      .toBuffer({ resolveWithObject: true });
    const whitest = Math.max(
      ...Array.from({ length: width }, (_, x) =>
        Math.min(data[x * 3], data[x * 3 + 1], data[x * 3 + 2]),
      ),
    );
    expect(whitest).toBeLessThan(150);
  });

  it("refuse des bandes qui ne laisseraient aucune image d'origine", async () => {
    const original = await croppedWithWhiteBands(100, 100, 10);
    const generated = await sharp({
      create: { width: 1024, height: 1024, channels: 3, background: "#0000ff" },
    })
      .png()
      .toBuffer();
    await expect(
      compositeFill(original, generated, { left: 60, right: 60, top: 0, bottom: 0, canvasWidth: 100, canvasHeight: 100 }, 100, 100),
    ).rejects.toThrow(/incohérentes/);
  });
});
