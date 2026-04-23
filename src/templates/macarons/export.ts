import type { MacaronItem } from "@/types";

export const CMS_CSS_URL =
   "https://fr.staging-orchestra.fr/on/demandware.static/Sites-FR-Site/-/fr_FR/v1776150212293/css/global.css";

interface ExportContext {
   year: number;
   week: number;
   locale: string;
}

const cssStyle = `
   .quickaccess-list {
      padding: 0px 20px 0px 20px;
   }
   .quickaccess-list a:hover {
      text-decoration: none;
   }
   .quickaccess-item {
      max-width: 70px;
   }
   .quickaccess-item>span,
   .quickaccess-item>h1,
   .quickaccess-item>h2 {
      font-size: 12px;
      line-height: 12px;
      padding-top: 5px;
   }
`;

export function generateMacaronsHTML(
   items: MacaronItem[],
   ctx: ExportContext,
): string {
   const visibleItems = items.filter((item) => item.visible);

   const itemsHTML = visibleItems
      .map((item) => {
         const wk = String(item.imageWeek ?? ctx.week).padStart(2, "0");
         const imgPath = `homepage/${ctx.year}/wk${wk}/${ctx.locale}/quickaccess-${esc(item.imageId)}`;

         const plainLabel = esc(item.label.replace(/\n/g, " "));
         const htmlLabel = esc(item.label).replace(/\n/g, "<br>");

         const href =
            item.linkType === "cgid"
               ? `$url('Search-Show','cgid','${esc(item.cgid.trim().replace(/\s/g, ""))}')$`
               : item.linkType === "cid"
                  ? `$httpsUrl('Page-Show','cid','${esc(item.cid.trim().replace(/\s/g, ""))}')$`
                  : esc(item.link.trim().replace(/\s/g, ""));

         return `      <a href="${href}"
         class="quickaccess-item d-flex flex-column align-items-center text-nowrap mr-4 mr-md-5" aria-label="${plainLabel}">
         <picture>
            <source srcset="${imgPath}.webp?$staticlink$" type="image/webp" />
            <source srcset="${imgPath}.jpg?$staticlink$" type="image/jpeg" />
            <img src="${imgPath}.jpg?$staticlink$" alt="${plainLabel}"
               class="bg-light rounded-circle" width="70" height="70" aria-hidden="true" />
         </picture>
         <h2 class="font-weight-bold text-center mt-1">${htmlLabel}</h2>
      </a>`;
      })
      .join("\n\n");

   return `<style>
   ${cssStyle}
</style>
<div class="d-flex justify-content-md-center">
   <div class="quickaccess-list d-flex flex-row flex-nowrap overflow-auto py-3 ml-3">
${itemsHTML}
   </div>
</div>`;
}

/**
 * Generates preview-ready HTML using real imageUrl values instead of CMS paths.
 * Used by the iframe preview so uploaded images display correctly.
 */
export function generatePreviewHTML(
   items: MacaronItem[],
): string {
   const visibleItems = items.filter((item) => item.visible);

   const itemsHTML = visibleItems
      .map((item) => {
         const plainLabel = esc(item.label.replace(/\n/g, " "));
         const htmlLabel = esc(item.label).replace(/\n/g, "<br>");
         const imgSrc = item.imageUrl || "";
         const comment = (item.comment ?? "").trim();
         const hasComment = !!comment;
         const outlineHtml = hasComment
            ? '<span class="quickaccess-comment-outline" aria-hidden="true"></span>'
            : "";
         const commentHtml = comment
            ? `<span class="quickaccess-comment" title="${esc(comment)}" aria-label="Commentaire">i</span>`
            : "";

         return `      <a href="#"
         class="quickaccess-item${hasComment ? " quickaccess-item--has-comment" : ""} d-flex flex-column align-items-center text-nowrap mr-4 mr-md-5" aria-label="${plainLabel}">
         ${outlineHtml}
         <picture>
            <img src="${esc(imgSrc)}" alt="${plainLabel}"
               class="bg-light rounded-circle" width="70" height="70" aria-hidden="true"
               style="object-fit:cover;" />
         </picture>
         ${commentHtml}
         <h2 class="font-weight-bold text-center mt-1">${htmlLabel}</h2>
      </a>`;
      })
      .join("\n\n");

   return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<link rel="stylesheet" href="${CMS_CSS_URL}" />
<style>
   ${cssStyle}
   body { margin: 0; background: #fff; cursor: default; }
   .quickaccess-item {
      position: relative;
      max-width: 70px;
   }
   .quickaccess-comment-outline {
      position: absolute;
      inset: 0;
      z-index: 999;
      border: 2px solid #dc2626;
      border-radius: 4px;
      pointer-events: none;
   }
   .quickaccess-comment {
      position: absolute;
      top: 0;
      right: 0;
      z-index: 999;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      color: #fff;
      background: #dc2626;
      border-radius: 4px;
      width: 20px;
      height: 20px;
      font-size: 13px;
      font-weight: 700;
      font-family: Arial, sans-serif;
      line-height: 1;
      padding-top: 0;
      box-shadow: 0 1px 4px rgba(0,0,0,0.12);
   }
</style>
</head>
<body>
<div class="d-flex justify-content-md-center">
   <div class="quickaccess-list d-flex flex-row flex-nowrap overflow-auto py-3 ml-3">
${itemsHTML}
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
    window.parent.postMessage({ type: "resize", height: document.body.scrollHeight }, "*");
  }).observe(document.body);
</script>
</body>
</html>`;
}

function esc(str: string): string {
   return str
      .replace(/[\u200B\u200C\u200D\uFEFF\u00AD]/g, "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
}
