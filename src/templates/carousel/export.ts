import type { CarouselButton, CarouselContent, CarouselSlide } from "@/types";
import { getPreviewCommentHtml, previewCommentStyles } from "@/components/preview-comment-overlay";
import { PREVIEW_CMS_CSS_HREF, PREVIEW_ROOT_VARS } from "@/lib/cms-css";

interface ExportContext {
  year: number;
  week: number;
  locale: string;
}

const BRAND_LOGO_STAGING_BASE =
  "https://fr.shop-orchestra.com/on/demandware.static/-/Library-Sites-OrchestraSharedLibrary/default/dw5f0e0dfb/logo-puericulture/";
const CLUB_ICON_STAGING =
  "https://fr.shop-orchestra.com/on/demandware.static/-/Library-Sites-OrchestraSharedLibrary/default/dwe6daf39c/icons/ico-club.svg";

// CSS scopé au carousel (v2-html/carousel.html) — sert uniquement à la
// preview : les classes Bootstrap (.carousel, .carousel-item, .carousel-
// indicators de base...) sont déjà dans le CSS du CMS proxifié en preview,
// ici seulement les surcharges propres à ce composant. Le slide (Bootstrap
// carousel JS) est déjà géré par le site — pas de <script> dans l'export.
// .absolute-btn / .background-filter-effect.black : non fournies dans le
// fichier source (déjà dans le CSS global du site) — approximation minimale
// ci-dessous pour que la preview reste lisible.
const cssStyle = `
  #carouselHomepage > .carousel-inner {
    height: 395px;
  }

  .carousel-indicators > li {
    height: 15px;
    width: 15px;
    border-radius: 50px;
    border: 2px solid #fff;
    box-sizing: border-box;
    background-color: transparent;
    opacity: 1;
    margin: 0px 7px 0px 7px;
  }

  .carousel-indicators li::before,
  .carousel-indicators li::after {
    position: absolute;
    left: 0;
    display: inline-block;
    width: 100%;
    height: 10px;
    content: "";
  }

  .carousel-indicators li::before { top: -10px; }
  .carousel-indicators li::after { bottom: -10px; }

  .carousel-indicators .active {
    border: none;
    background-color: #fff;
  }

  #carouselHomepage > .carousel-inner > .carousel-item.active,
  .carousel-item-next,
  .carousel-item-prev {
    display: flex;
    justify-content: center;
  }

  .carousel-product {
    color: #262626;
    background: rgb(255 255 255 / 66%);
    padding: 12px;
    height: fit-content;
    font-size: 13px;
    line-height: 16px;
  }

  .carousel-product.right { border-radius: 20px 20px 0px 20px; }
  .carousel-product.left { border-radius: 20px 20px 20px 0px; }

  .carousel-public-price {
    color: #707070;
    font-weight: 600;
  }

  .carousel-club-price {
    font-size: 16px;
    font-weight: 900;
    line-height: 19px;
  }

  .width-fit {
    max-width: fit-content;
    width: inherit;
  }

  .carousel-buttons {
    gap: 10px;
    scroll-behavior: smooth;
    -webkit-overflow-scrolling: touch;
    -ms-overflow-style: none;
    scrollbar-width: none;
  }

  .carousel-buttons::-webkit-scrollbar { display: none; }
  .carousel-buttons a:first-child { margin-left: 30px; }
  .carousel-buttons a:last-child { margin-right: 30px !important; }

  #carouselHomepage .carousel-title {
    font-family: "Alphakind", Lato, sans-serif;
    text-transform: uppercase;
    font-size: 2rem;
    line-height: 2.75rem;
  }

  .imgSoldes {
    height: clamp(200px, 20vw, 350px);
    width: 100%;
    object-fit: contain;
  }

  .absolute-btn {
    position: absolute;
    inset: 0;
    z-index: 2;
  }

  .background-filter-effect.black {
    position: absolute;
    inset: 0;
    background: rgba(0, 0, 0, 0.35);
    z-index: 1;
  }

  @media screen and (min-width: 777px) {
    .carousel-product-container { max-width: 777px; }
    #carouselHomepage .carousel-title { font-size: 3.25rem; line-height: 3.75rem; }
  }

  @media screen and (min-width: 1440px) {
    #carouselHomepage > .carousel-inner { height: 600px; }
    #carouselHomepage .carousel-title { font-size: 4rem; line-height: 4.5rem; }
  }
`;

function getHref(item: { linkType: "cgid" | "url" | "cid"; cgid: string; cid: string; link: string }): string {
  if (item.linkType === "cgid")
    return `$url('Search-Show','cgid','${esc(item.cgid.trim().replace(/\s/g, ""))}')$`;
  if (item.linkType === "cid")
    return `$httpsUrl('Page-Show','cid','${esc(item.cid.trim().replace(/\s/g, ""))}')$`;
  return esc(item.link.trim());
}

function buttonsHTML(buttons: CarouselButton[], preview: boolean): string {
  return (buttons ?? [])
    .map(
      (btn) =>
        `            <a class="btn btn-style-2" href="${preview ? "#" : getHref(btn)}">${esc(btn.text)}</a>`,
    )
    .join("\n");
}

function productCalloutHTML(slide: CarouselSlide, preview: boolean): string {
  const p = slide.productCallout;
  if (!p?.enabled) return "";
  const logoSrc = preview
    ? `${BRAND_LOGO_STAGING_BASE}${p.brandLogoPath}`
    : `logo-puericulture/${p.brandLogoPath}?$staticlink$`;
  const clubIconSrc = preview ? CLUB_ICON_STAGING : "icons/ico-club.svg?$staticlink$";

  return `          <div class="carousel-product-container d-flex flex-row w-100 h-100 p-4 justify-content-end align-items-end align-items-md-end">
            <div class="carousel-product ${p.side} d-flex flex-column align-items-start">
              ${p.showBrandLogo ? `<img src="${logoSrc}" alt="Logo marque" height="32" class="pb-1">` : ""}
              <span class="font-weight-bold text-left">${esc(p.label)}</span>
              <span class="carousel-public-price">${esc(p.publicPrice)}</span>
              <span class="carousel-club-price d-flex">${esc(p.clubPrice)}${p.showClubIcon ? ` <img src="${clubIconSrc}" alt="Club Orchestra" width="22" class="ml-1">` : ""}${p.showPromoBadge ? ` <span class="label-promo px-1 ml-1">${esc(p.promoBadgeText)}</span>` : ""}</span>
            </div>
          </div>\n`;
}

function slideHTML(slide: CarouselSlide, slot: number, isFirst: boolean, ctx: ExportContext): string {
  const wk = String(slide.imageWeek ?? ctx.week).padStart(2, "0");
  const imgPath = `homepage/${ctx.year}/wk${wk}/${ctx.locale}/carousel-${slot}`;
  const titleWk = String(slide.titleImageWeek ?? ctx.week).padStart(2, "0");
  const titleImgPath = `homepage/${ctx.year}/wk${titleWk}/${ctx.locale}/carousel-${slot}-title`;
  const plainTitle = esc(slide.titleText.replace(/\r?\n/g, " "));

  const mediaHTML =
    slide.mediaType === "video"
      ? `        <video class="carousel-${slot} w-100 h-100" src="${imgPath}.mp4?$staticlink$" poster="${imgPath}.jpg?$staticlink$" type="video/mp4" title="${plainTitle}" playsinline autoplay loop muted>
          Votre navigateur ne prend pas en charge la balise vidéo.
        </video>`
      : `        <picture>
          <source media="(min-width: 1200px)" srcset="${imgPath}.webp?$staticlink$" class="w-100 h-100">
          <source media="(max-width: 1199px)" srcset="${imgPath}.webp?$staticlink$" class="w-100 h-100">
          <img src="${imgPath}.webp?$staticlink$" alt="" class="carousel-${slot} w-100 h-100" aria-hidden="true">
        </picture>`;

  const titleHTML =
    slide.titleType === "image"
      ? `${slide.titleImageUrl ? `<img src="${titleImgPath}.jpg?$staticlink$" class="imgSoldes" alt="${plainTitle}">` : ""}`
      : `<span class="carousel-title">${esc(slide.titleText).replace(/\r?\n/g, "<br>")}</span>`;

  return `      <div class="carousel-item w-100 h-100${isFirst ? " active" : ""}">
        <div class="background-filter-container position-absolute w-100 h-100">
${slide.darkOverlay ? '          <div class="background-filter-effect black"></div>\n' : ""}${mediaHTML}
        </div>
        <div class="carousel-caption d-flex flex-column align-items-center w-100 position-relative">
${productCalloutHTML(slide, false)}          <div class="d-flex flex-column align-items-center justify-content-end w-100 h-100">
            ${titleHTML}
          </div>
          <div class="width-fit d-flex justify-content-md-center z-2">
            <div class="carousel-buttons d-flex flex-row flex-nowrap overflow-auto pt-3 pb-4">
${buttonsHTML(slide.buttons, false)}
            </div>
          </div>
          <a href="${getHref(slide)}" aria-label="${plainTitle}" class="absolute-btn position-absolute"></a>
        </div>
      </div>`;
}

export function generateCarouselHTML(content: CarouselContent, ctx: ExportContext): string {
  const slides = content.slides ?? [];
  const slidesHTML = slides.map((slide, i) => slideHTML(slide, i + 1, i === 0, ctx)).join("\n");
  const indicatorsHTML = slides
    .map((_, i) => `      <li data-target="#carouselHomepage" data-slide-to="${i}"${i === 0 ? ' class="active"' : ""}></li>`)
    .join("\n");

  return `<div class="general-layout">
  <div id="carouselHomepage" class="carousel slide" data-ride="carousel">
    <ol class="carousel-indicators z-2">
${indicatorsHTML}
    </ol>
    <div class="carousel-inner">
${slidesHTML}
    </div>
  </div>
</div>`;
}

function slidePreviewHTML(slide: CarouselSlide, isFirst: boolean): string {
  const hasComment = !!(slide.comment ?? "").trim();
  const commentHtml = getPreviewCommentHtml(slide.comment);
  const plainTitle = esc(slide.titleText.replace(/\r?\n/g, " "));

  const mediaHTML =
    slide.mediaType === "video" && slide.videoUrl
      ? `        <video class="w-100 h-100" src="${esc(slide.videoUrl)}" poster="${esc(slide.imageUrl || "")}" playsinline autoplay loop muted></video>`
      : `        <img src="${esc(slide.imageUrl || "")}" alt="" class="w-100 h-100" style="object-fit:cover;" aria-hidden="true">`;

  const titleHTML =
    slide.titleType === "image"
      ? slide.titleImageUrl
        ? `<img src="${esc(slide.titleImageUrl)}" class="imgSoldes" alt="${plainTitle}">`
        : ""
      : `<span class="carousel-title">${esc(slide.titleText).replace(/\r?\n/g, "<br>")}</span>`;

  return `      <div class="carousel-item w-100 h-100${isFirst ? " active" : ""}${hasComment ? " preview-has-comment" : ""}" style="display:${isFirst ? "flex" : "none"};position:relative;">
${commentHtml}        <div class="background-filter-container position-absolute w-100 h-100">
${slide.darkOverlay ? '          <div class="background-filter-effect black"></div>\n' : ""}${mediaHTML}
        </div>
        <div class="carousel-caption d-flex flex-column align-items-center w-100 position-relative">
${productCalloutHTML(slide, true)}          <div class="d-flex flex-column align-items-center justify-content-end w-100 h-100">
            ${titleHTML}
          </div>
          <div class="width-fit d-flex justify-content-md-center z-2">
            <div class="carousel-buttons d-flex flex-row flex-nowrap overflow-auto pt-3 pb-4">
${buttonsHTML(slide.buttons, true)}
            </div>
          </div>
        </div>
      </div>`;
}

export function generatePreviewHTML(content: CarouselContent, frameId = ""): string {
  const slides = content.slides ?? [];
  const slidesHTML = slides.map((slide, i) => slidePreviewHTML(slide, i === 0)).join("\n");
  const indicatorsHTML = slides
    .map((_, i) => `      <li data-slide="${i}" class="preview-dot${i === 0 ? " active" : ""}"></li>`)
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
#carouselHomepage { position: relative; overflow: hidden; }
.carousel-caption{left: 0;}
</style>
</head>
<body>
<div class="general-layout">
  <div id="carouselHomepage" class="carousel slide">
    <ol class="carousel-indicators z-2">
${indicatorsHTML}
    </ol>
    <div class="carousel-inner">
${slidesHTML}
    </div>
  </div>
</div>
<script>
  // Preview uniquement : simule le slide au clic sur les points (le vrai
  // JS Bootstrap du site gère l'export réel, pas embarqué ici).
  document.querySelectorAll(".preview-dot").forEach((dot) => {
    dot.addEventListener("click", () => {
      const idx = dot.getAttribute("data-slide");
      document.querySelectorAll(".carousel-item").forEach((item, i) => {
        item.style.display = String(i) === idx ? "flex" : "none";
      });
      document.querySelectorAll(".preview-dot").forEach((d) => d.classList.remove("active"));
      dot.classList.add("active");
    });
  });

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
