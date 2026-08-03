import type { ImgSousMenuItem } from "@/types";
import { PREVIEW_CMS_CSS_HREF, PREVIEW_ROOT_VARS } from "@/lib/cms-css";

// Pas de HTML réel à exporter pour ce template : seuls les fichiers image
// comptent (cf. section-images.ts / export/images route) — l'intégration
// CMS se fait à la main à partir de ces fichiers, pas d'un snippet généré
// ici. Ce fichier ne fournit donc que la preview (repère visuel pendant
// l'édition), pas de generateXHTML pour le "vrai" export.

// CSS scopé à la preview uniquement : empilage simple, léger gap entre
// chaque image, chacune responsive dans sa largeur d'origine.
const cssStyle = `
  .img-sous-menu {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .img-sous-menu__img {
    display: block;
    max-width: 100%;
    height: auto;
  }

  .img-sous-menu__label {
    margin: 0 0 4px;
    font-size: 12px;
    font-weight: 600;
    color: #666;
  }
`;

export function generatePreviewHTML(items: ImgSousMenuItem[], frameId = ""): string {
  const itemsHTML = items
    .map((item) => {
      const label = (item.label ?? "").trim();
      return `    <div>
      ${label ? `<p class="img-sous-menu__label">${esc(label)}</p>` : ""}
      <img src="${esc(item.imageUrl || "")}" alt="" class="img-sous-menu__img">
    </div>`;
    })
    .join("\n");

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<link rel="stylesheet" href="${PREVIEW_CMS_CSS_HREF}" />
<style>
${PREVIEW_ROOT_VARS}
${cssStyle}
body { margin: 0; background: #fff; cursor: default; }
</style>
</head>
<body>
<div class="img-sous-menu">
${itemsHTML}
</div>
<script>
  new ResizeObserver(() => {
    window.parent.postMessage({ type: "resize", frameId: ${JSON.stringify(frameId)}, height: document.body.scrollHeight }, "*");
  }).observe(document.body);
</script>
</body>
</html>`;
}

const INVISIBLE_CHARS = new RegExp(
  `[${String.fromCharCode(0x200b)}-${String.fromCharCode(0x200d)}${String.fromCharCode(0xfeff)}${String.fromCharCode(0x00ad)}]`,
  "g",
);

function esc(str: string): string {
  return str
    .replace(INVISIBLE_CHARS, "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
