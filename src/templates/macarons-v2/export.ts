import type { MacaronItem, QuickaccessPlacement } from "@/types";
import { getPreviewCommentHtml, previewCommentStyles } from "@/components/preview-comment-overlay";
import { PREVIEW_CMS_CSS_HREF, PREVIEW_ROOT_VARS } from "@/lib/cms-css";
import { buildCmsImagePath } from "@/lib/cms-image-path";
import type { ExportContext } from "@/lib/cms-image-path";

// CSS scopé au nouveau design "Macaron v2" (v2-html/quickaccess.html +
// v2-html/style.html). Coexiste avec le CSS des macarons v1 (quickaccess-list),
// classes différentes, aucune collision.
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

/**
 * Classes CMS par emplacement. Même structure HTML des deux côtés, seuls les
 * noms de classes changent — y compris la classe de conteneur, qui n'est pas
 * au même endroit : sur le <nav> pour la page d'accueil, sur le <ul> pour la
 * catégorie niveau 2. Relevé sur le HTML réel des deux pages.
 */
const PLACEMENT_CLASSES: Record<QuickaccessPlacement, { nav: string; list: string; item: string }> = {
  homepage: {
    nav: "quickaccess-v2 hp-cat-container",
    list: "quickaccess-v2__list",
    item: "quickaccess-v2-item",
  },
  cat_lvl2: {
    nav: "quickaccess-lvl2",
    list: "quickaccess-lvl2__list hp-cat-lvl2-container",
    item: "quickaccess-lvl2-item",
  },
};

export function generateQuickaccessV2HTML(
  items: MacaronItem[],
  ctx: ExportContext,
  sectionCustomPath?: string | null,
  placement: QuickaccessPlacement = "homepage",
): string {
  const cls = PLACEMENT_CLASSES[placement] ?? PLACEMENT_CLASSES.homepage;
  const visibleItems = items.filter((item) => item.visible);

  const itemsHTML = visibleItems
    .map((item, index) => {
      // Pas de "-v2" dans l'URL : "-v2" ne concerne que le nom du template
      // côté outil, l'export CMS suit le même schéma que quickaccess v1 —
      // nommage par position (parmi les items visibles), pas par imageId.
      // exportPosition fige le numéro pour les items venant d'une autre semaine.
      const imgPath = buildCmsImagePath(
        item,
        ctx,
        item.imageWeek,
        `quickaccess-${item.exportPosition ?? index + 1}`,
        sectionCustomPath,
      );
      const htmlLabel = esc(item.label).replace(/\n/g, "<br>");

      return `    <li>
      <a href="${getHref(item)}" class="${cls.item}">
        <picture class="${cls.item}__picture">
          <source srcset="${imgPath}.webp?$staticlink$" type="image/webp" />
          <source srcset="${imgPath}.jpg?$staticlink$" type="image/jpeg" />
          <img
            src="${imgPath}.jpg?$staticlink$"
            alt=""
            class="${cls.item}__img"
            width="200"
            height="300"
            aria-hidden="true"
          />
        </picture>
        <h3 class="${cls.item}__label">${htmlLabel}</h3>
      </a>
    </li>`;
    })
    .join("\n");

  // Pas de <style> : le CSS existe déjà côté CMS, on n'exporte que le HTML.
  return `<nav class="${cls.nav}" aria-label="Accès rapide aux catégories">
  <ul class="${cls.list}" role="list">
${itemsHTML}
  </ul>
</nav>`;
}

/**
 * Generates preview-ready HTML using real imageUrl values instead of CMS paths.
 * frameId identifies this iframe in resize messages (plusieurs previews écoutent
 * sur la même fenêtre parent — sans lui elles s'écrasent la hauteur les unes des autres).
 */
export function generatePreviewHTML(
  items: MacaronItem[],
  frameId = "",
  placement: QuickaccessPlacement = "homepage",
): string {
  // Mêmes classes qu'à l'export : sans ça, choisir « catégorie niveau 2 »
  // ne changeait rien à l'écran alors que l'export, lui, changeait bien.
  const cls = PLACEMENT_CLASSES[placement] ?? PLACEMENT_CLASSES.homepage;
  // Le CSS du CMS proxifié ne contient aucune de ces classes : toute la mise en
  // forme de l'aperçu vient de cssStyle, écrit pour la page d'accueil. La
  // structure HTML étant la même des deux côtés, on rejoue ces règles sous les
  // noms de classes du niveau 2, sinon l'aperçu s'affiche sans aucun style.
  const placementCss =
    placement === "cat_lvl2"
      ? cssStyle
          .replace(/quickaccess-v2/g, "quickaccess-lvl2")
          .replace(/hp-cat-container/g, "hp-cat-lvl2-container")
      : "";
  const visibleItems = items.filter((item) => item.visible);

  const itemsHTML = visibleItems
    .map((item) => {
      const htmlLabel = esc(item.label).replace(/\n/g, "<br>");
      const imgSrc = item.imageUrl || "";
      const comment = (item.comment ?? "").trim();
      const hasComment = !!comment;
      const commentHtml = getPreviewCommentHtml(item.comment);

      return `    <li>
      <a href="#" class="${cls.item}${hasComment ? " preview-has-comment" : ""}">
        ${commentHtml}
        <picture class="${cls.item}__picture">
          <img src="${esc(imgSrc)}" alt="" class="${cls.item}__img" aria-hidden="true" />
        </picture>
        <h3 class="${cls.item}__label">${htmlLabel}</h3>
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
${PREVIEW_ROOT_VARS}
${cssStyle}
${placementCss}
.quickaccess-v2__list li, .quickaccess-lvl2__list li {max-width: 200px;}
.quickaccess-v2, .quickaccess-lvl2 {overflow: visible;}
${previewCommentStyles}
body { margin: 0; background: #fff; cursor: default; }
</style>
</head>
<body>
<nav class="${cls.nav}" aria-label="Accès rapide aux catégories">
  <ul class="${cls.list}" role="list">
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
