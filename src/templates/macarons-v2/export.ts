import type { MacaronItem } from "@/types";
import { getPreviewCommentHtml, previewCommentStyles } from "@/components/preview-comment-overlay";
import { PREVIEW_CMS_CSS_HREF } from "@/lib/cms-css";

// CSS scopé au nouveau design "Macaron v2" (v2-html/quickaccess.html +
// v2-html/style.html). Coexiste avec le CSS des macarons v1 (quickaccess-list),
// classes différentes, aucune collision.
interface ExportContext {
  year: number;
  week: number;
  locale: string;
}

const cssStyle = `
  .hp-cat-container {
    width: calc(100% - 48px);
    margin: auto;
    color: var(--o-primary);
  }

  .quickaccess-v2 {
    padding: clamp(2rem, 2.07vw + 1.008rem, 2.625rem) 0;
    border-bottom: 1px solid var(--o-neutral-100);
    overflow-y: hidden;
    scrollbar-width: none;
    -ms-overflow-style: none;
    cursor: grab;
    user-select: none;
  }

  .quickaccess-v2::-webkit-scrollbar {
    display: none;
  }

  .quickaccess-v2__list {
    display: flex;
    flex-wrap: nowrap;
    justify-content: center;
    gap: clamp(1rem, 1.189vw + 0.43rem, 1.5rem);
    width: 100%;
    min-width: fit-content;
    margin: auto;
    padding: 0;
    list-style: none;
    cursor: grab;
  }

  .quickaccess-v2__list li {
    flex: 1;
    height: auto;
    min-height: 200px;
    width: 100%;
    min-width: 120px;
  }

  .quickaccess-v2-item {
    position: relative;
    display: grid;
    grid-template-rows: 1fr auto;
    grid-template-columns: 100%;
    width: 100%;
    height: 100%;
    box-shadow: 0 1px 3px 0px rgba(0, 0, 0, 0.2);
    border-radius: var(--o-radius-lg);
    overflow: hidden;
    transition:
      transform 0.3s ease-in-out,
      box-shadow 0.3s ease-in-out;
  }

  .quickaccess-v2-item,
  .quickaccess-v2-item img {
    -webkit-user-drag: none;
  }

  .quickaccess-v2-item:focus-visible {
    outline: 2px solid var(--o-primary);
    outline-offset: 3px;
  }

  .quickaccess-v2-item:hover {
    text-decoration: none;
    transform: translateY(-6px);
  }

  .quickaccess-v2-item__picture {
    grid-row: 1/-1;
    grid-column: 1/-1;
    width: 100%;
    height: 100%;
    overflow: hidden;
  }

  .quickaccess-v2-item__img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .quickaccess-v2-item__label {
    grid-row: 2/-1;
    grid-column: 1/-1;
    font-weight: 400;
    font-size: var(--o-fs-text-xs);
    line-height: 1.4;
    padding: var(--o-spacing-2xs);
    text-align: center;
    border-radius: var(--o-radius-sm);
    background-color: var(--o-neutral-50);
    width: calc(100% - 24px);
    margin: 0 auto 12px auto;
  }

  @media (prefers-reduced-motion: reduce) {
    .quickaccess-v2-item {
      transition: none;
    }
    .quickaccess-v2-item:hover {
      transform: none;
    }
  }
`;

function getHref(item: MacaronItem): string {
  if (item.linkType === "cgid")
    return `$url('Search-Show','cgid','${esc(item.cgid.trim().replace(/\s/g, ""))}')$`;
  if (item.linkType === "cid")
    return `$httpsUrl('Page-Show','cid','${esc(item.cid.trim().replace(/\s/g, ""))}')$`;
  return esc(item.link.trim().replace(/\s/g, ""));
}

export function generateQuickaccessV2HTML(
  items: MacaronItem[],
  ctx: ExportContext,
): string {
  const visibleItems = items.filter((item) => item.visible);

  const itemsHTML = visibleItems
    .map((item, index) => {
      const wk = String(item.imageWeek ?? ctx.week).padStart(2, "0");
      // Pas de "-v2" dans l'URL : "-v2" ne concerne que le nom du template
      // côté outil, l'export CMS suit le même schéma que quickaccess v1 —
      // nommage par position (parmi les items visibles), pas par imageId.
      // exportPosition fige le numéro pour les items venant d'une autre semaine.
      const imgPath = `homepage/${ctx.year}/wk${wk}/${ctx.locale}/quickaccess-${item.exportPosition ?? index + 1}`;
      const plainLabel = esc(item.label.replace(/\n/g, " "));

      return `    <li>
      <a href="${getHref(item)}" class="quickaccess-v2-item">
        <picture class="quickaccess-v2-item__picture">
          <source srcset="${imgPath}.webp?$staticlink$" type="image/webp" />
          <source srcset="${imgPath}.jpg?$staticlink$" type="image/jpeg" />
          <img
            src="${imgPath}.jpg?$staticlink$"
            alt=""
            class="quickaccess-v2-item__img"
            width="200"
            height="300"
            aria-hidden="true"
          />
        </picture>
        <h3 class="quickaccess-v2-item__label">${plainLabel}</h3>
      </a>
    </li>`;
    })
    .join("\n");

  // Pas de <style> : le CSS existe déjà côté CMS, on n'exporte que le HTML.
  return `<nav class="quickaccess-v2 hp-cat-container" aria-label="Accès rapide aux catégories">
  <ul class="quickaccess-v2__list" role="list">
${itemsHTML}
  </ul>
</nav>`;
}

/**
 * Generates preview-ready HTML using real imageUrl values instead of CMS paths.
 * frameId identifies this iframe in resize messages (plusieurs previews écoutent
 * sur la même fenêtre parent — sans lui elles s'écrasent la hauteur les unes des autres).
 */
export function generatePreviewHTML(items: MacaronItem[], frameId = ""): string {
  const visibleItems = items.filter((item) => item.visible);

  const itemsHTML = visibleItems
    .map((item) => {
      const plainLabel = esc(item.label.replace(/\n/g, " "));
      const imgSrc = item.imageUrl || "";
      const comment = (item.comment ?? "").trim();
      const hasComment = !!comment;
      const commentHtml = getPreviewCommentHtml(item.comment);

      return `    <li>
      <a href="#" class="quickaccess-v2-item${hasComment ? " preview-has-comment" : ""}">
        ${commentHtml}
        <picture class="quickaccess-v2-item__picture">
          <img src="${esc(imgSrc)}" alt="" class="quickaccess-v2-item__img" aria-hidden="true" />
        </picture>
        <h3 class="quickaccess-v2-item__label">${plainLabel}</h3>
      </a>
    </li>`;
    })
    .join("\n");

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<link rel="stylesheet" href="${PREVIEW_CMS_CSS_HREF}" />
<style>
${cssStyle}
${previewCommentStyles}
body { margin: 0; background: #fff; cursor: default; }
</style>
</head>
<body>
<nav class="quickaccess-v2 hp-cat-container" aria-label="Accès rapide aux catégories">
  <ul class="quickaccess-v2__list" role="list">
${itemsHTML}
  </ul>
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
