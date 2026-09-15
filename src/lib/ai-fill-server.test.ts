import { describe, it, expect } from "vitest";
import sharp from "sharp";
import { cropToTarget, padToFrame } from "./ai-fill-server";
import { planGeneration } from "./ai-fill";

describe("padToFrame", () => {
  // Point sensible : ces marges ne doivent jamais être blanches. Du blanc en
  // plus se lit comme une zone à inventer et pousse le modèle à reculer le
  // cadrage — c'est ce qui dézoomait le sujet.
  it("étire les pixels du bord au lieu d'ajouter du blanc", async () => {
    const width = 1000;
    const height = 600;
    const frame = planGeneration(width, height);
    expect(frame.offsetY).toBeGreaterThan(0);

    // Image rouge unie : les marges doivent ressortir rouges, pas blanches.
    const original = await sharp({
      create: { width, height, channels: 3, background: "#ff0000" },
    })
      .png()
      .toBuffer();

    const padded = await padToFrame(original, frame, width, height);
    expect(await sharp(padded).metadata()).toMatchObject({
      width: frame.width,
      height: frame.height,
    });

    for (const y of [0, frame.height - 1]) {
      const pixel = await sharp(padded)
        .extract({ left: 500, top: y, width: 1, height: 1 })
        .raw()
        .toBuffer();
      expect(pixel[0]).toBeGreaterThan(200);
      expect(pixel[1]).toBeLessThan(60);
      expect(pixel[2]).toBeLessThan(60);
    }
  });
});

describe("cropToTarget", () => {
  // Le modèle ne rend que dans quelques formats fixes. On lui envoie donc une
  // toile déjà au bon ratio, marges blanches comprises, et on découpe au
  // retour. Si cette découpe est fausse, le sujet ressort écrasé ou décalé —
  // c'était le défaut visible des premières versions. Ici on simule un modèle
  // parfait (le même rendu, à sa propre taille) et on vérifie qu'un repère
  // horizontal retombe exactement à sa hauteur d'origine.
  it("rend la taille cible sans déformer ni décaler le sujet", async () => {
    const width = 1000;
    const height = 600;
    const markerY = 300;
    const frame = planGeneration(width, height);
    expect(frame).toMatchObject({ width: 1000, height: 667, offsetX: 0, offsetY: 33 });

    const canvasSentToModel = await sharp({
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

    const [genWidth, genHeight] = frame.size.split("x").map(Number);
    const generated = await sharp(canvasSentToModel)
      .resize(genWidth, genHeight, { fit: "fill" })
      .png()
      .toBuffer();

    const result = await cropToTarget(generated, frame, width, height);
    expect(await sharp(result).metadata()).toMatchObject({ width, height });

    const { data } = await sharp(result)
      .extract({ left: 10, top: 0, width: 1, height })
      .raw()
      .toBuffer({ resolveWithObject: true });
    const redRows = Array.from({ length: height }, (_, y) => y).filter(
      (y) => data[y * 3] > 150 && data[y * 3 + 2] < 100,
    );
    const center = (redRows[0] + redRows[redRows.length - 1]) / 2;
    expect(Math.abs(center - markerY)).toBeLessThanOrEqual(2);
  });

  it("ne rogne rien quand la cible est déjà au format du modèle", async () => {
    const frame = planGeneration(200, 300);
    expect(frame).toMatchObject({ offsetX: 0, offsetY: 0 });
    const generated = await sharp({
      create: { width: 1024, height: 1536, channels: 3, background: "#00ff00" },
    })
      .png()
      .toBuffer();
    expect(await sharp(await cropToTarget(generated, frame, 200, 300)).metadata()).toMatchObject({
      width: 200,
      height: 300,
    });
  });
});
