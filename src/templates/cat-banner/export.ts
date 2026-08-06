import type { CatBannerItem } from "@/types";
import { PREVIEW_CMS_CSS_HREF, PREVIEW_ROOT_VARS } from "@/lib/cms-css";
import { slugify } from "./schema";

interface ExportContext {
  year: number;
  week: number;
  locale: string;
}

// Un item = un <div> autonome (fond + lien + image desktop/mobile), copié
// individuellement dans le CMS — cf. generateCatBannerHTML plus bas pour la
// version "tout collé" (zip/API) qui réutilise ce même générateur.
export function generateCatBannerItemHTML(item: CatBannerItem, ctx: ExportContext): string {
  const wk = String(item.imageWeek ?? ctx.week).padStart(2, "0");
  const slug = slugify(item.label);
  const path = `banner/${ctx.year}/wk${wk}/${ctx.locale}`;
  const alt = `${esc(item.label)} - Je découvre`;
  const href = esc(item.url.trim());

  return `<div class="w-100">
    <a href="${href}">
        <img src="${path}/banner-desktop-${slug}.jpg?$staticlink$" alt="${alt}" class="w-100 d-none d-md-block mx-auto ">
        <img src="${path}/banner-mobile-${slug}.jpg?$staticlink$" alt="${alt}" class="w-100 d-block d-md-none mx-auto">
     </a>
</div>`;
}

export function generateCatBannerHTML(items: CatBannerItem[], ctx: ExportContext): string {
  return items.map((item) => generateCatBannerItemHTML(item, ctx)).join("\n\n");
}

export function generatePreviewHTML(items: CatBannerItem[], frameId = ""): string {
  const itemsHTML = items
    .map((item) => {
      const label = (item.label ?? "").trim();
      return `    <div class="cat-banner__item">
      ${label ? `<p class="cat-banner__label">${esc(label)}</p>` : ""}
      <div class="cat-banner__row">
        <div class="cat-banner__slot">
          <span class="cat-banner__tag">Desktop</span>
          <img src="${esc(item.desktopImageUrl || "")}" alt="" class="cat-banner__img">
        </div>
        <div class="cat-banner__slot cat-banner__slot--mobile">
          <span class="cat-banner__tag">Mobile</span>
          <img src="${esc(item.mobileImageUrl || "")}" alt="" class="cat-banner__img">
        </div>
      </div>
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
body { margin: 0; background: #fff; cursor: default; font-family: sans-serif; }
.cat-banner__item { margin-bottom: 16px; }
.cat-banner__label { margin: 0 0 6px; font-size: 12px; font-weight: 600; color: #666; }
.cat-banner__row { display: flex; gap: 10px; align-items: flex-start; }
.cat-banner__slot { flex: 1; min-width: 0; }
.cat-banner__slot--mobile { max-width: 160px; flex: none; }
.cat-banner__tag { display: block; margin-bottom: 4px; font-size: 10px; text-transform: uppercase; letter-spacing: 0.03em; color: #999; }
.cat-banner__img { display: block; width: 100%; height: auto; background: #f3f3f3; }
</style>
</head>
<body>
${itemsHTML}
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
