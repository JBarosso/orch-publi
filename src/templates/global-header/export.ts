import type { GlobalHeaderContent, GlobalHeaderItem } from "@/types";
import { accessibleTextColor } from "@/lib/contrast-color";
import { getPreviewCommentHtml, previewCommentStyles } from "@/components/preview-comment-overlay";
import { PREVIEW_CMS_CSS_HREF } from "@/lib/cms-css";

// Contrairement aux autres templates, ce <style> EST exporté : la couleur du
// bandeau est propre à chaque section (choisie dans l'éditeur), le CMS n'a
// pas de classe statique pour ça — exactement comme dans les fichiers
// exemples/global-header-*.html fournis (chacun embarque son propre <style>
// avec ses variables --header-banner_bg-color / --header-banner_color).
// Pas de <script> : la rotation est gérée par le JS Bootstrap déjà présent
// sur le site via data-ride="carousel".
function cssStyle(bgColor: string, textColor: string): string {
  return `
  .carousel-inner a:hover {
    text-decoration: none;
  }

  .header-banner {
    --header-banner_bg-color: ${bgColor};
    --header-banner_color: ${textColor};
    display: flex;
    align-items: center;
    background-color: var(--header-banner_bg-color);
    font-size: 10px;
    letter-spacing: 1px;
    font-weight: 800;
  }

  .header-banner .close-button .close {
    background-color: var(--header-banner_bg-color);
    color: var(--header-banner_color);
  }

  .header-banner a {
    color: var(--header-banner_color);
  }

  .header-banner div:nth-child(1) {
    align-items: center;
  }

  #globalheaderDiv .text-black,
  #globalheaderDiv .color-black {
    color: var(--header-banner_color) !important;
  }

  .close {
    text-shadow: none;
  }

  .header-banner .content {
    width: 100%;
  }

  @media screen and (max-width: 768px) {
    .header-banner {
      font-size: 9px;
      letter-spacing: 0;
    }
  }

  @media screen and (max-width: 480px) {
    .header-banner {
      font-size: 9px;
      letter-spacing: 0;
    }
  }
`;
}

function getHref(item: GlobalHeaderItem): string {
  if (item.linkType === "cgid")
    return `$url('Search-Show','cgid','${esc(item.cgid.trim().replace(/\s/g, ""))}')$`;
  if (item.linkType === "cid")
    return `$httpsUrl('Page-Show','cid','${esc(item.cid.trim().replace(/\s/g, ""))}')$`;
  if (item.linkType === "url") return esc(item.link.trim());
  return "";
}

const ITEM_CLASSES = "text-center text-black text-uppercase px-5 m-0 px-md-0 d-block";

function itemHTML(item: GlobalHeaderItem, isFirst: boolean, preview: boolean): string {
  const inner = esc(item.text);
  const tag =
    item.linkType === "none"
      ? `<span class="${ITEM_CLASSES}">${inner}</span>`
      : `<a href="${preview ? "#" : getHref(item)}" class="${ITEM_CLASSES}">${inner}</a>`;
  return `      <div class="carousel-item h-auto${isFirst ? " active" : ""}">
        ${tag}
      </div>`;
}

export function generateGlobalHeaderHTML(content: GlobalHeaderContent): string {
  const items = content.items ?? [];
  const textColor = accessibleTextColor(content.bgColor);
  const itemsHTML = items.map((item, i) => itemHTML(item, i === 0, false)).join("\n");

  return `<style>
${cssStyle(content.bgColor, textColor)}</style>
<div id="globalheaderDiv" class="carousel slide" data-ride="carousel">
  <div class="carousel-inner">
${itemsHTML}
  </div>
</div>`;
}

// Preview : les items sont empilés les uns sous les autres (pas de rotation
// simulée), pour voir tout le contenu de la section d'un coup d'oeil.
export function generatePreviewHTML(content: GlobalHeaderContent, frameId = ""): string {
  const items = content.items ?? [];
  const textColor = accessibleTextColor(content.bgColor);

  const rowsHTML = items
    .map((item) => {
      const hasComment = !!(item.comment ?? "").trim();
      return `<div class="header-banner${hasComment ? " preview-has-comment" : ""}" style="position:relative;">
  ${item.comment ? getPreviewCommentHtml(item.comment) : ""}${itemHTML(item, true, true)}
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
${cssStyle(content.bgColor, textColor)}
${previewCommentStyles}
body { margin: 0; background: #fff; cursor: default; }
.header-banner { min-height: 32px; }
.header-banner + .header-banner { margin-top: 2px; }
</style>
</head>
<body>
${rowsHTML || '<p style="font-family:sans-serif;font-size:12px;color:#999;padding:8px;">Ajoutez un item pour voir l’aperçu</p>'}
<script>
  document.addEventListener("click", (event) => {
    const target = event.target;
    if (target instanceof Element && target.closest("a")) {
      event.preventDefault();
    }
  });

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
