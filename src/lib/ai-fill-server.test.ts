import { describe, it, expect } from "vitest";
import sharp from "sharp";
import { backgroundFromGeneration, buildGenerationInputs, compositeFill } from "./ai-fill-server";
import { computeBlankBands, planGeneration } from "./ai-fill";

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

    const frame = planGeneration(width, height);
    const background = await backgroundFromGeneration(generated, frame, width, height);
    const merged = await compositeFill(original, background, bands, width, height);
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

  // Le défaut constaté en vrai : les bandes générées ne s'alignaient pas
  // verticalement avec la photo — rebord de marche et lignes du décor
  // décalés à la jonction. Cause : l'image partait dans un ratio et revenait
  // dans un autre, donc déformée au retour. Ici on simule un modèle parfait
  // (un simple agrandissement de la toile qu'on lui envoie) et on vérifie
  // qu'un repère horizontal retombe exactement à sa hauteur d'origine.
  it("rend le décor à la même échelle que la photo, sans décalage vertical", async () => {
    const width = 1000;
    const height = 600;
    const markerY = 300;
    const frame = planGeneration(width, height);

    // Toile telle qu'elle part au modèle : marges comprises, avec un trait
    // horizontal rouge à la hauteur du repère.
    const padded = await sharp({
      create: { width: frame.width, height: frame.height, channels: 3, background: "#0000ff" },
    })
      .composite([
        {
          input: {
            create: { width: frame.width, height: 10, channels: 3, background: "#ff0000" },
          },
          left: 0,
          top: frame.offsetY + markerY - 5,
        },
      ])
      .png()
      .toBuffer();

    // Modèle parfait : il rend la même image, au format qu'il sait produire.
    const [genWidth, genHeight] = frame.size.split("x").map(Number);
    const generated = await sharp(padded).resize(genWidth, genHeight, { fit: "fill" }).png().toBuffer();

    const background = await backgroundFromGeneration(generated, frame, width, height);
    expect(await sharp(background).metadata()).toMatchObject({ width, height });

    // Hauteur du trait rouge dans le résultat ramené à la taille cible.
    const { data } = await sharp(background)
      .extract({ left: 10, top: 0, width: 1, height })
      .raw()
      .toBuffer({ resolveWithObject: true });
    const redRows = Array.from({ length: height }, (_, y) => y).filter(
      (y) => data[y * 3] > 150 && data[y * 3 + 2] < 100,
    );
    const center = (redRows[0] + redRows[redRows.length - 1]) / 2;
    expect(Math.abs(center - markerY)).toBeLessThanOrEqual(2);
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

describe("buildGenerationInputs", () => {
  // Le report d'alpha se met à l'envers pour un rien : ce test fixe le sens
  // attendu. Transparent = à peindre par le modèle, opaque = à conserver.
  it("rend transparent tout ce qui est à peindre, et seulement cela", async () => {
    const width = 1000;
    const height = 600;
    const band = 200;
    const original = await croppedWithWhiteBands(width, height, band);
    const frame = planGeneration(width, height);

    // Masque tel que le construit le navigateur : noir opaque sur la zone à
    // garder, transparent sur les bandes vides.
    const mask = await sharp({
      create: { width, height, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
    })
      .composite([
        {
          input: {
            create: {
              width: width - band * 2,
              height,
              channels: 4,
              background: { r: 0, g: 0, b: 0, alpha: 1 },
            },
          },
          left: band,
          top: 0,
        },
      ])
      .png()
      .toBuffer();

    const inputs = await buildGenerationInputs(original, mask, frame, width, height);
    expect(await sharp(inputs.image).metadata()).toMatchObject({
      width: frame.width,
      height: frame.height,
      channels: 4,
    });

    const alphaAt = async (buffer: Buffer, x: number, y: number) => {
      const pixel = await sharp(buffer)
        .ensureAlpha()
        .extract({ left: Math.round(x), top: Math.round(y), width: 1, height: 1 })
        .raw()
        .toBuffer();
      return pixel[3];
    };

    const midY = frame.offsetY + height / 2;
    // Bandes vides du recadrage : à peindre.
    expect(await alphaAt(inputs.image, 10, midY)).toBe(0);
    expect(await alphaAt(inputs.image, frame.width - 10, midY)).toBe(0);
    // Marges ajoutées pour la mise au format : à peindre aussi.
    expect(await alphaAt(inputs.image, frame.width / 2, 5)).toBe(0);
    expect(await alphaAt(inputs.image, frame.width / 2, frame.height - 5)).toBe(0);
    // Zone utile : conservée.
    expect(await alphaAt(inputs.image, frame.width / 2, midY)).toBe(255);
    // Le masque transmis couvre la même toile, avec la même règle.
    expect(await alphaAt(inputs.mask, 10, midY)).toBe(0);
    expect(await alphaAt(inputs.mask, frame.width / 2, midY)).toBe(255);
  });
});

describe("planGeneration", () => {
  // 1000x600 est en 5:3, le modèle ne rend qu'en 3:2 : on complète en hauteur
  // plutôt que de le laisser étirer l'image.
  it("complète l'image jusqu'au ratio exact du format généré", () => {
    expect(planGeneration(1000, 600)).toEqual({
      size: "1536x1024",
      width: 1000,
      height: 667,
      offsetX: 0,
      offsetY: 33,
    });
    expect(planGeneration(1920, 1080)).toMatchObject({ width: 1920, height: 1280, offsetY: 100 });
  });

  it("n'ajoute rien quand la cible est déjà au bon ratio", () => {
    expect(planGeneration(200, 300)).toEqual({
      size: "1024x1536",
      width: 200,
      height: 300,
      offsetX: 0,
      offsetY: 0,
    });
  });

  it("complète en largeur quand la cible est plus étroite que le format généré", () => {
    // 600x700 vise le carré : il manque de la largeur, pas de la hauteur.
    expect(planGeneration(600, 700)).toMatchObject({
      size: "1024x1024",
      width: 700,
      height: 700,
      offsetX: 50,
      offsetY: 0,
    });
  });

  it("garde un ratio de toile aligné sur celui du format demandé", () => {
    for (const [w, h] of [[1000, 600], [1920, 1080], [600, 700], [200, 300], [301, 301]]) {
      const frame = planGeneration(w, h);
      const [genWidth, genHeight] = frame.size.split("x").map(Number);
      expect(Math.abs(frame.width / frame.height - genWidth / genHeight)).toBeLessThan(0.01);
      // La toile contient toujours l'image cible en entier.
      expect(frame.width).toBeGreaterThanOrEqual(w);
      expect(frame.height).toBeGreaterThanOrEqual(h);
    }
  });
});
