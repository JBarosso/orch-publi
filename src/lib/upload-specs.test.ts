import { describe, it, expect } from "vitest";
import sharp from "sharp";
import { ACCEPTED_SHARP_FORMATS, validateSourceFile } from "@/lib/upload-specs";

describe("upload AVIF", () => {
  // Piège : sharp ne rapporte pas « avif » mais « heif ». Sans ce nom dans la
  // liste, le serveur refuserait un AVIF que le navigateur a laissé passer.
  it("le format rapporté par sharp pour un AVIF est accepté par le serveur", async () => {
    const avif = await sharp({
      create: { width: 8, height: 8, channels: 3, background: "#c00" },
    })
      .avif()
      .toBuffer();
    expect(ACCEPTED_SHARP_FORMATS).toContain((await sharp(avif).metadata()).format);
  });

  it("accepte un .avif, y compris quand le navigateur ne rapporte aucun type MIME", () => {
    expect(validateSourceFile({ type: "image/avif", size: 1000, name: "visuel.avif" })).toBeNull();
    expect(validateSourceFile({ type: "", size: 1000, name: "VISUEL.AVIF" })).toBeNull();
  });

  it("refuse toujours le HEIC, que sharp ne sait pas décoder", () => {
    expect(validateSourceFile({ type: "image/heic", size: 1000, name: "photo.heic" })).not.toBeNull();
  });
});
