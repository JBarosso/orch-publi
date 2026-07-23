import type { ArianeContent, ArianeLink } from "@/types";
import { getPreviewCommentHtml, previewCommentStyles } from "@/components/preview-comment-overlay";
import { PREVIEW_CMS_CSS_HREF, PREVIEW_ROOT_VARS } from "@/lib/cms-css";

// CSS scopé au fil d'ariane (v2-html/ariane.html + v2-html/style.html) — sert
// uniquement à la preview : le CMS a déjà ce CSS, pas de <style> dans l'export.
const cssStyle = `
  .hp-cat-container {
    width: calc(100% - 48px);
    margin: auto;
    color: var(--o-primary);
  }

  .hp-cat-filariane {
    /* padding (pas margin-block comme dans le CSS source) : une marge sur
       l'élément racine du body de la preview se collapse avec le margin du
       body de l'iframe, ce qui fausse document.body.scrollHeight utilisé
       pour le redimensionnement — visuellement identique, le vrai CMS garde
       son margin-block d'origine (ce CSS scopé n'est jamais exporté). */
    padding-block: 16px;
  }

  .hp-cat-filariane_container {
    position: relative;
    display: flex;
    justify-content: flex-start;
    align-items: center;
    flex-flow: row wrap;
    gap: 12px;
  }

  .hp-cat-filariane__title {
    font-size: clamp(1.25rem, 1.556vw + 0.504rem, 1.5rem);
    font-weight: 600;
    line-height: 1.2;
    margin: 0;
    width: max-content;
    white-space: nowrap;
  }

  .hp-cat-filariane__list {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    justify-content: flex-start;
    align-items: center;
    flex-flow: row nowrap;
    gap: 12px;
    overflow-y: auto;
    width: 100%;
    position: relative;
    flex: 1;
    flex-basis: fit-content;
  }

  .hp-cat-filariane__item h2 {
    margin: 0;
  }

  .hp-cat-filariane__link {
    display: block;
    font-weight: 400;
    text-decoration: none;
    font-size: 13px;
    padding: 4px 12px 2px 12px;
    line-height: 1.4;
    width: max-content;
    border: 1px solid var(--o-primary);
    border-radius: var(--o-radius-sm);
    transition:
      background-color 0.3s ease-in-out,
      color 0.3s ease-in-out;
  }

  .hp-cat-filariane__link:focus-visible {
    outline: 2px solid var(--o-primary);
    outline-offset: 3px;
  }

  .hp-cat-filariane__link:hover {
    background-color: var(--o-primary);
    color: #fff;
    text-decoration: none;
  }
`;

function getHref(link: ArianeLink): string {
  if (link.linkType === "cgid")
    return `$url('Search-Show','cgid','${esc(link.cgid.trim().replace(/\s/g, ""))}')$`;
  if (link.linkType === "cid")
    return `$httpsUrl('Page-Show','cid','${esc(link.cid.trim().replace(/\s/g, ""))}')$`;
  return esc(link.link.trim());
}

export function generateArianeHTML(content: ArianeContent): string {
  const linksHTML = content.links
    .map(
      (link) => `      <li class="hp-cat-filariane__item">
        <h2><a href="${getHref(link)}" class="hp-cat-filariane__link">${esc(link.label)}</a></h2>
      </li>`,
    )
    .join("\n");

  return `<nav class="hp-cat-filariane hp-cat-container" aria-label="Navigation par catégorie">
  <div class="hp-cat-filariane_container">
    <h1 class="hp-cat-filariane__title">${esc(content.title)}</h1>
    <ul class="hp-cat-filariane__list" role="list">
${linksHTML}
    </ul>
  </div>
</nav>`;
}

export function generatePreviewHTML(content: ArianeContent, frameId = ""): string {
  const comment = (content.comment ?? "").trim();
  const hasComment = !!comment;
  const commentHtml = getPreviewCommentHtml(content.comment);

  const linksHTML = content.links
    .map(
      (link) => `      <li class="hp-cat-filariane__item">
        <h2><a href="#" class="hp-cat-filariane__link">${esc(link.label)}</a></h2>
      </li>`,
    )
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
${previewCommentStyles}
body { margin: 0; background: #fff; cursor: default; }
</style>
</head>
<body>
<nav class="hp-cat-filariane hp-cat-container${hasComment ? " preview-has-comment" : ""}" aria-label="Navigation par catégorie">
${commentHtml}
  <div class="hp-cat-filariane_container">
    <h1 class="hp-cat-filariane__title">${esc(content.title)}</h1>
    <ul class="hp-cat-filariane__list" role="list">
${linksHTML}
    </ul>
  </div>
</nav>
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
