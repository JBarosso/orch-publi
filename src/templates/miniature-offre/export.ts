import type { MiniatureOffreItem } from "@/types";
import { PREVIEW_CMS_CSS_HREF, PREVIEW_ROOT_VARS } from "@/lib/cms-css";

// Pas de HTML réel à exporter pour ce template (comme img-sous-menu) : seuls
// les fichiers image comptent (cf. section-images.ts). Ce fichier ne fournit
// donc que la preview (repère visuel pendant l'édition).

const cssStyle = `
  .miniature-offre {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
  }

  .miniature-offre__item {
    width: 301px;
  }

  .miniature-offre__img {
    display: block;
    width: 100%;
    aspect-ratio: 1 / 1;
    object-fit: cover;
  }

  .miniature-offre__label {
    margin: 4px 0 0;
    font-size: 12px;
    font-weight: 600;
    color: #666;
  }
`;

export function generatePreviewHTML(items: MiniatureOffreItem[], frameId = ""): string {
  const itemsHTML = items
    .map((item) => {
      const label = (item.label ?? "").trim();
      return `    <div class="miniature-offre__item">
      <img src="${esc(item.imageUrl || "")}" alt="" class="miniature-offre__img">
      ${label ? `<p class="miniature-offre__label">${esc(label)}</p>` : ""}
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
<div class="miniature-offre">
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
