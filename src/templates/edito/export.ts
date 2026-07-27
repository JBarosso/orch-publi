import type { EditoCard, MeaButton } from "@/types";
import { getPreviewCommentHtml, previewCommentStyles } from "@/components/preview-comment-overlay";
import { PREVIEW_CMS_CSS_HREF, PREVIEW_ROOT_VARS } from "@/lib/cms-css";

interface ExportContext {
  year: number;
  week: number;
  locale: string;
}

// CSS scopé à edito (v2-html/edito.html + v2-html/style.html) — sert
// uniquement à la preview : le CMS a déjà ce CSS, pas de <style> dans l'export.
// Le carousel mobile (piste + dots) est piloté par le JS déjà présent sur le
// site CMS ("updateCarousel", cf. commentaire dans style.html) — pas de
// <script> à embarquer ici, seulement le markup attendu par ce JS.
const cssStyle = `
  .hp-cat-container {
    width: calc(100% - 48px);
    margin: auto;
    color: var(--o-primary);
  }
  .hp-cat-container--small {
    max-width: 1080px;
  }

  .edito-grid {
    position: relative;
    overflow: hidden;
    margin: 64px auto;
  }

  .edito-grid__track {
    display: flex;
    margin: auto;
    transition: transform 0.4s ease;
  }

  .edito-card[data-color="blue"] { --edito-bg: var(--o-pastel-blue-light); --edito-color: var(--o-pastel-blue); }
  .edito-card[data-color="green"] { --edito-bg: var(--o-pastel-green-light); --edito-color: var(--o-pastel-green); }
  .edito-card[data-color="aqua"] { --edito-bg: var(--o-pastel-aqua-light); --edito-color: var(--o-pastel-aqua); }
  .edito-card[data-color="purple"] { --edito-bg: var(--o-pastel-purple-light); --edito-color: var(--o-pastel-purple); }
  .edito-card[data-color="pink"] { --edito-bg: var(--o-pastel-pink-light); --edito-color: var(--o-pastel-pink); }
  .edito-card[data-color="peach"] { --edito-bg: var(--o-pastel-peach-light); --edito-color: var(--o-pastel-peach); }

  .edito-card {
    display: grid;
    grid-template-columns: 100%;
    grid-template-rows: repeat(2, auto) 1fr;
    min-width: 100%;
    background-color: var(--edito-bg, var(--o-primary-100));
    color: var(--edito-color, var(--o-primary));
    max-width: 345px;
    padding: 24px;
    border-radius: 8px;
  }

  .edito-card__media {
    position: relative;
    width: 100%;
    height: 240px;
    overflow: hidden;
    margin-bottom: 24px;
  }

  .edito-card__img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
    border-radius: 4px;
    transition: all 0.3s ease-in-out;
  }

  .edito-card__media:hover img {
    scale: 1.05;
  }

  .edito-card__body {
    flex: 1;
    margin-bottom: 16px;
  }

  .edito-card__title {
    font-size: 20px;
    font-weight: 900;
    margin: 0 0 10px;
    line-height: 1.2;
  }

  .edito-card__text {
    font-size: 13px;
    line-height: 1.2;
    margin: 0;
  }

  .edito-card__actions {
    align-self: flex-end;
    display: flex;
    flex-flow: row wrap;
    align-items: center;
    justify-content: flex-start;
    gap: 8px;
  }

  .edito-card__btn {
    display: inline-block;
    border-radius: 8px;
    text-decoration: none;
    padding: 10px 20px;
    font-size: 16px;
    font-weight: 400;
    line-height: 1;
    background-color: var(--o-primary);
    border: 1px solid var(--o-primary);
    color: #fff;
    transition: all 0.3s ease-in-out;
  }

  .edito-card__btn:hover {
    text-decoration: none;
    background-color: transparent;
    color: var(--o-primary);
  }

  .edito-grid__indicators {
    display: flex;
    justify-content: center;
    gap: 8px;
    padding: 12px 0;
  }

  .edito-grid__dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    border: 2px solid #262626;
    background: transparent;
    cursor: pointer;
    padding: 0;
  }

  .edito-grid__dot.active {
    background: #262626;
  }

  @media (min-width: 1024px) {
    .edito-grid {
      display: flex;
      overflow: visible;
    }
    .edito-grid__track {
      display: flex;
      transform: none !important;
      gap: 24px;
    }
    .edito-card {
      min-width: 0;
      flex: 1;
    }
    .edito-grid__indicators {
      display: none;
    }
  }
`;

function getHref(item: EditoCard): string {
  if (item.linkType === "cgid")
    return `$url('Search-Show','cgid','${esc(item.cgid.trim().replace(/\s/g, ""))}')$`;
  if (item.linkType === "cid")
    return `$httpsUrl('Page-Show','cid','${esc(item.cid.trim().replace(/\s/g, ""))}')$`;
  return esc(item.link.trim());
}

function getButtonHref(btn: MeaButton): string {
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
        `        <a href="${preview ? "#" : getButtonHref(btn)}" class="edito-card__btn edito-card__btn--primary">${esc(btn.text)}</a>`,
    )
    .join("\n");
}

function cardHTML(item: EditoCard, imgPath: string, href: string, plainTitle: string): string {
  return `    <article class="edito-card" data-color="${item.theme}">
      <a href="${href}" class="edito-card__media">
        <picture class="edito-card__picture">
          <source srcset="${imgPath}.webp?$staticlink$" type="image/webp">
          <source srcset="${imgPath}.jpg?$staticlink$" type="image/jpeg">
          <img src="${imgPath}.jpg?$staticlink$" alt="" class="edito-card__img" width="300" height="250" aria-hidden="true" loading="lazy">
        </picture>
      </a>
      <div class="edito-card__body">
        <h3 class="edito-card__title">${plainTitle}</h3>
        ${item.text.trim() ? `<p class="edito-card__text">${esc(item.text)}</p>` : ""}
      </div>
      <div class="edito-card__actions">
${buttonsHTML(item.buttons, false)}
      </div>
    </article>`;
}

function dotsHTML(count: number): string {
  return Array.from({ length: count }, (_, i) => i)
    .map((i) => `    <button class="edito-grid__dot${i === 0 ? " active" : ""}" data-slide-to="${i}"></button>`)
    .join("\n");
}

export function generateEditoHTML(items: EditoCard[], ctx: ExportContext): string {
  const cardsHTML = items
    .map((item, index) => {
      const wk = String(item.imageWeek ?? ctx.week).padStart(2, "0");
      const imgPath = `homepage/${ctx.year}/wk${wk}/${ctx.locale}/edito-${item.exportPosition ?? index + 1}`;
      const plainTitle = esc(item.title.replace(/\n/g, " "));
      return cardHTML(item, imgPath, getHref(item), plainTitle);
    })
    .join("\n\n");

  return `<section class="edito-grid hp-cat-container hp-cat-container--small" aria-label="Actualités et offres">

  <div class="edito-grid__track" id="editoTrack">

${cardsHTML}

  </div>

  <div class="edito-grid__indicators" id="editoDots">
${dotsHTML(items.length)}
  </div>

</section>`;
}

export function generatePreviewHTML(items: EditoCard[], frameId = ""): string {
  const cardsHTML = items
    .map((item) => {
      const plainTitle = esc(item.title.replace(/\n/g, " "));
      const hasComment = !!(item.comment ?? "").trim();
      const commentHtml = getPreviewCommentHtml(item.comment);

      return `    <article class="edito-card${hasComment ? " preview-has-comment" : ""}" data-color="${item.theme}">
${commentHtml}      <a href="#" class="edito-card__media">
        <picture class="edito-card__picture">
          <img src="${esc(item.imageUrl || "")}" alt="" class="edito-card__img" aria-hidden="true">
        </picture>
      </a>
      <div class="edito-card__body">
        <h3 class="edito-card__title">${plainTitle}</h3>
        ${item.text.trim() ? `<p class="edito-card__text">${esc(item.text)}</p>` : ""}
      </div>
      <div class="edito-card__actions">
${buttonsHTML(item.buttons, true)}
      </div>
    </article>`;
    })
    .join("\n\n");

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
<section class="edito-grid hp-cat-container hp-cat-container--small" aria-label="Actualités et offres">

  <div class="edito-grid__track" id="editoTrack">

${cardsHTML}

  </div>

  <div class="edito-grid__indicators" id="editoDots">
${dotsHTML(items.length)}
  </div>

</section>
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
