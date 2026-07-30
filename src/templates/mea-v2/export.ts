import type { MeaV2Content, MeaV2Card, MeaV2FocusCard, MeaButton } from "@/types";
import { getPreviewCommentHtml, previewCommentStyles } from "@/components/preview-comment-overlay";
import { PREVIEW_CMS_CSS_HREF, PREVIEW_ROOT_VARS } from "@/lib/cms-css";
import { focusCardHasContent } from "./schema";

interface ExportContext {
  year: number;
  week: number;
  locale: string;
}

// CSS scopé au nouveau design "MEA v2" (v2-html/header.html + v2-html/style.html).
// Coexiste avec le CSS des MEA v1 (.mea/.mea__*), classes différentes, aucune collision.
const cssStyle = `
  .hp-cat-container {
    width: calc(100% - 48px);
    margin: auto;
    color: var(--o-primary);
  }

  .hp-cat-header__container {
    display: flex;
    flex-flow: row wrap;
    gap: 16px;
  }

  @media (max-width: 639.9px) {
    .hp-cat-header__container {
      flex-direction: column;
    }
  }

  .hp-cat-header-meas {
    display: grid;
    gap: 16px;
    flex: 2;
    grid-template-columns: repeat(5, 1fr);
    grid-template-rows: repeat(2, 1fr);
    min-height: 476px;
  }

  @media (max-width: 767px) {
    .hp-cat-header-meas {
      grid-template-columns: repeat(2, 1fr);
    }
  }

  @media (max-width: 639.9px) {
    .hp-cat-header-meas {
      grid-template-rows: repeat(9, 1fr);
    }
  }

  @media (min-width: 766.9px) {
    .hp-cat-header-meas > *:nth-child(3n + 1) {
      grid-column: span 3;
    }
  }

  @media (max-width: 639.9px) {
    .hp-cat-header-meas > *:nth-child(2n + 1) {
      grid-row: span 5;
    }
  }

  .hp-cat-header-mea {
    position: relative;
    display: grid;
    overflow: hidden;
    grid-template-rows: 1fr auto;
    grid-template-columns: 100%;
    border-radius: 8px;
    background-color: #efefef;
  }

  @media (min-width: 640px) {
    .hp-cat-header-mea {
      height: clamp(14.313rem, 43.969vw - 6.765rem, 21.375rem);
    }
  }

  @media (max-width: 639.9px) {
    .hp-cat-header-mea {
      grid-row: span 4;
    }
  }

  @media (min-width: 767px) {
    .hp-cat-header-mea {
      grid-column: span 2;
    }
  }

  .hp-cat-header-mea__picture,
  .hp-cat-header-mea__video {
    grid-row: 1/-1;
    grid-column: 1/-1;
    position: relative;
    z-index: 0;
    transition: all 0.3s ease-in-out;
  }

  .hp-cat-header-mea:has(.hp-cat-header__link:hover) .hp-cat-header-mea__picture,
  .hp-cat-header-mea:has(.hp-cat-header__link:hover) .hp-cat-header-mea__video {
    scale: 1.05;
  }

  .hp-cat-header-mea__picture {
    height: 100%;
    width: 100%;
  }

  .hp-cat-header-mea__video,
  .hp-cat-header-mea__img {
    height: 100%;
    width: 100%;
    object-fit: cover;
  }

  .hp-cat-header-mea__container {
    z-index: 2;
    grid-row: 2/-1;
    grid-column: 1/-1;
    padding: 24px clamp(1rem, 3.113vw - 0.492rem, 1.5rem);
    color: #fff;
  }

  .hp-cat-header-mea__title {
    font-size: 20px;
    text-transform: uppercase;
    font-weight: 900;
    margin-bottom: 6px;
    position: relative;
    z-index: 2;
    hyphens: auto;
    overflow-wrap: break-word;
  }

  .hp-cat-header-mea__buttons {
    display: flex;
    align-items: center;
    justify-content: flex-start;
    flex-flow: row wrap;
    gap: 8px;
  }

  .hp-cat-header-mea__button {
    position: relative;
    z-index: 2;
    line-height: 1.4;
    font-size: 13px;
    color: var(--o-primary);
    border: 1px solid var(--o-neutral-50);
    background-color: var(--o-neutral-50);
    border-radius: var(--o-radius-sm);
    padding: 4px 12px 2px 12px;
    text-decoration: none;
    text-align: center;
    transition:
      background-color 0.3s ease-in-out,
      color 0.3s ease-in-out,
      border-color 0.3s ease-in-out;
  }

  .hp-cat-header-mea__button:focus-visible {
    outline: 2px solid #fff;
    outline-offset: 3px;
  }

  .hp-cat-header-mea__button:hover {
    text-decoration: none;
    color: var(--o-neutral-50);
    background-color: transparent;
  }

  .hp-cat-header__link {
    position: absolute;
    left: 0;
    top: 0;
    width: 100%;
    height: 100%;
    z-index: 1;
    background: linear-gradient(transparent 50%, rgba(0, 0, 0, 0.4));
  }

  @media (max-width: 767px) {
    .hp-cat-header__link {
      background: rgba(0, 0, 0, 0.25);
    }
  }

  .hp-cat-header--focus {
    flex: 1;
    min-height: clamp(29.688rem, 87.549vw - 12.281rem, 43.75rem);
  }

  .hp-cat-header--focus .hp-cat-header-mea__title {
    font-family: var(--o-family-heading);
    font-size: clamp(2.5rem, 7.782vw - 1.231rem, 3.75rem);
    line-height: 1.1;
    margin-bottom: 18px;
  }

  .hp-cat-header-mea__appelPrix {
    --edge-spacing: clamp(1rem, 3.113vw - 0.492rem, 1.5rem);
    position: absolute;
    background-color: rgba(0, 0, 0, 0.25);
    padding: 8px;
    border-radius: 8px;
    box-shadow: 0 1px 3px 0px rgba(0, 0, 0, 0.2);
    color: #fff;
    z-index: 3;
    right: var(--edge-spacing);
    top: var(--edge-spacing);
  }

  .hp-cat-header-mea__appelPrix p {
    margin: 0;
  }

  .hp-cat-header-mea__appelPrix-title {
    font-size: 16px;
    font-weight: 700;
    margin-bottom: 6px;
  }

  .hp-cat-header-mea__appelPrix-prices {
    display: flex;
    flex-flow: row wrap;
    justify-content: flex-start;
    align-items: center;
    gap: 6px;
    font-weight: 900;
    font-size: 13px;
  }

  .hp-cat-header-mea__appelPrix-price-club {
    background-color: var(--o-club-primary);
    display: flex;
    flex-flow: row wrap;
    justify-content: flex-start;
    align-items: center;
    gap: 4px;
    padding: 4px 8px;
    border-radius: 4px;
    line-height: 1;
  }

  .hp-cat-header-mea__appelPrix-price-club-icon {
    width: 32px;
    object-fit: contain;
    position: relative;
    bottom: 1px;
  }
`;

function getCardLinkUrl(card: MeaV2Card): string {
  if (card.linkType === "cgid")
    return `$url('Search-Show','cgid','${esc(card.cgid.trim().replace(/\s/g, ""))}')$`;
  if (card.linkType === "cid")
    return `$httpsUrl('Page-Show','cid','${esc(card.cid.trim().replace(/\s/g, ""))}')$`;
  return esc(card.link.trim());
}

function getButtonUrl(btn: MeaButton): string {
  if (btn.linkType === "cgid")
    return `$url('Search-Show','cgid','${esc(btn.cgid.trim().replace(/\s/g, ""))}')$`;
  if (btn.linkType === "cid")
    return `$httpsUrl('Page-Show','cid','${esc(btn.cid.trim().replace(/\s/g, ""))}')$`;
  return esc(btn.link.trim());
}

function buttonsHTML(buttons: MeaButton[], preview: boolean): string {
  return (buttons ?? [])
    .map(
      (btn) =>
        `            <a href="${preview ? "#" : getButtonUrl(btn)}" class="hp-cat-header-mea__button">${esc(btn.text)}</a>`,
    )
    .join("\n");
}

const CLUB_ICON_STAGING =
  "https://fr.shop-orchestra.com/on/demandware.static/-/Library-Sites-OrchestraSharedLibrary/default/dwe6daf39c/icons/ico-club.svg";

function appelPrixHTML(focus: MeaV2FocusCard, preview: boolean): string {
  const p = focus.appelPrix;
  if (!p?.enabled) return "";
  const iconSrc = preview ? CLUB_ICON_STAGING : "icons/ico-club.svg?$staticlink$";
  return `        <div class="hp-cat-header-mea__appelPrix" positionX="right" positionY="top">
          <p class="hp-cat-header-mea__appelPrix-title">${esc(p.title)}</p>
          <p class="hp-cat-header-mea__appelPrix-prices">
            <span class="hp-cat-header-mea__appelPrix-price-initial">${esc(p.initialPrice)}</span>
            <span class="hp-cat-header-mea__appelPrix-price-club">
              <span class="hp-cat-header-mea__appelPrix-price-club-value">${esc(p.clubPrice)}</span>
              ${p.showClubIcon ? `<img src="${iconSrc}" alt="Club" class="hp-cat-header-mea__appelPrix-price-club-icon">` : ""}
            </span>
          </p>
        </div>\n`;
}

function regularCardHTML(card: MeaV2Card, index: number, ctx: ExportContext): string {
  const wk = String(card.imageWeek ?? ctx.week).padStart(2, "0");
  // Pas de "-v2" dans l'URL : "-v2" ne concerne que le nom du template côté
  // outil, l'export CMS suit le même schéma que mea v1 (mea-1, mea-2...).
  const imgPath = `homepage/${ctx.year}/wk${wk}/${ctx.locale}/mea-${index + 1}`;
  const plainTitle = esc(card.title.replace(/\n/g, " "));

  return `      <div class="hp-cat-header-mea hp-cat-header-mea--${index + 1}">
        <picture class="hp-cat-header-mea__picture">
          <source srcset="${imgPath}.webp?$staticlink$" type="image/webp" />
          <source srcset="${imgPath}.jpg?$staticlink$" type="image/jpeg" />
          <img src="${imgPath}.jpg?$staticlink$" alt="" class="hp-cat-header-mea__img" width="1000" height="600" aria-hidden="true" />
        </picture>
        <div class="hp-cat-header-mea__container">
          <h3 class="hp-cat-header-mea__title">${plainTitle}</h3>
          <div class="hp-cat-header-mea__buttons">
${buttonsHTML(card.buttons, false)}
          </div>
          <a href="${getCardLinkUrl(card)}" class="hp-cat-header__link" aria-hidden="true" tabindex="-1"></a>
        </div>
      </div>`;
}

function focusCardHTML(focus: MeaV2FocusCard, ctx: ExportContext): string {
  const wk = String(focus.imageWeek ?? ctx.week).padStart(2, "0");
  const imgPath = `homepage/${ctx.year}/wk${wk}/${ctx.locale}/mea-5`;
  const plainTitle = esc(focus.title.replace(/\n/g, " "));

  const mediaHTML =
    focus.mediaType === "video"
      ? `        <video
          class="hp-cat-header-mea__video"
          src="${imgPath}.mp4?$staticlink$"
          poster="${imgPath}.jpg?$staticlink$"
          type="video/mp4"
          aria-label="${plainTitle}"
          title="${plainTitle}"
          playsinline
          autoplay
          loop
          muted
          aria-hidden="true"
        >
          Votre navigateur ne prend pas en charge la balise vidéo.
        </video>`
      : `        <picture class="hp-cat-header-mea__picture">
          <source srcset="${imgPath}.webp?$staticlink$" type="image/webp" />
          <source srcset="${imgPath}.jpg?$staticlink$" type="image/jpeg" />
          <img src="${imgPath}.jpg?$staticlink$" alt="" class="hp-cat-header-mea__img" width="600" height="700" aria-hidden="true" />
        </picture>`;

  return `      <div class="hp-cat-header-mea hp-cat-header--focus">
${mediaHTML}
${appelPrixHTML(focus, false)}        <div class="hp-cat-header-mea__container">
          <h3 class="hp-cat-header-mea__title">${plainTitle}</h3>
          <div class="hp-cat-header-mea__buttons">
${buttonsHTML(focus.buttons, false)}
          </div>
          <a href="${getCardLinkUrl(focus)}" class="hp-cat-header__link" aria-hidden="true" tabindex="-1"></a>
        </div>
      </div>`;
}

export function generateMeaV2HTML(content: MeaV2Content, ctx: ExportContext): string {
  const cardsHTML = (content.cards ?? [])
    .map((card, i) => regularCardHTML(card, i, ctx))
    .join("\n\n");

  // Carte focus optionnelle : générée dès qu'au moins un champ est renseigné
  // (titre, lien, image, vidéo ou bouton) — cf. focusCardHasContent.
  const hasFocus = !!content.focus && focusCardHasContent(content.focus);

  // Pas de <style> : le CSS existe déjà côté CMS, on n'exporte que le HTML.
  return `<div class="hp-cat-header hp-cat-container">
  <div class="hp-cat-header__container">
    <div class="hp-cat-header-meas">
${cardsHTML}
    </div>
${hasFocus ? focusCardHTML(content.focus, ctx) : ""}
  </div>
</div>`;
}

function regularCardPreviewHTML(card: MeaV2Card, index: number): string {
  const plainTitle = esc(card.title.replace(/\n/g, " "));
  const comment = (card.comment ?? "").trim();
  const hasComment = !!comment;
  const commentHtml = getPreviewCommentHtml(card.comment);

  return `      <div class="hp-cat-header-mea hp-cat-header-mea--${index + 1}${hasComment ? " preview-has-comment" : ""}">
${commentHtml}
        <picture class="hp-cat-header-mea__picture">
          <img src="${esc(card.imageUrl || "")}" alt="" class="hp-cat-header-mea__img" aria-hidden="true" />
        </picture>
        <div class="hp-cat-header-mea__container">
          <h3 class="hp-cat-header-mea__title">${plainTitle}</h3>
          <div class="hp-cat-header-mea__buttons">
${buttonsHTML(card.buttons, true)}
          </div>
          <a href="#" class="hp-cat-header__link" aria-hidden="true" tabindex="-1"></a>
        </div>
      </div>`;
}

function focusCardPreviewHTML(focus: MeaV2FocusCard): string {
  const plainTitle = esc(focus.title.replace(/\n/g, " "));
  const comment = (focus.comment ?? "").trim();
  const hasComment = !!comment;
  const commentHtml = getPreviewCommentHtml(focus.comment);

  const mediaHTML =
    focus.mediaType === "video" && focus.videoUrl
      ? `        <video class="hp-cat-header-mea__video" src="${esc(focus.videoUrl)}" poster="${esc(focus.imageUrl || "")}" playsinline autoplay loop muted aria-hidden="true"></video>`
      : `        <picture class="hp-cat-header-mea__picture">
          <img src="${esc(focus.imageUrl || "")}" alt="" class="hp-cat-header-mea__img" aria-hidden="true" />
        </picture>`;

  return `      <div class="hp-cat-header-mea hp-cat-header--focus${hasComment ? " preview-has-comment" : ""}">
${commentHtml}
${mediaHTML}
${appelPrixHTML(focus, true)}        <div class="hp-cat-header-mea__container">
          <h3 class="hp-cat-header-mea__title">${plainTitle}</h3>
          <div class="hp-cat-header-mea__buttons">
${buttonsHTML(focus.buttons, true)}
          </div>
          <a href="#" class="hp-cat-header__link" aria-hidden="true" tabindex="-1"></a>
        </div>
      </div>`;
}

export function generatePreviewHTML(content: MeaV2Content, frameId = ""): string {
  const cardsHTML = (content.cards ?? [])
    .map((card, i) => regularCardPreviewHTML(card, i))
    .join("\n\n");
  // Même règle qu'à l'export : cf. focusCardHasContent, pour que l'aperçu
  // reflète fidèlement ce qui sera réellement exporté.
  const hasFocus = !!content.focus && focusCardHasContent(content.focus);

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
<div class="hp-cat-header hp-cat-container">
  <div class="hp-cat-header__container">
    <div class="hp-cat-header-meas">
${cardsHTML}
    </div>
${hasFocus ? focusCardPreviewHTML(content.focus) : ""}
  </div>
</div>
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
