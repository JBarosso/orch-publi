import type { CustomBlock, CustomContent } from "@/types";
import { getPreviewCommentHtml, previewCommentStyles } from "@/components/preview-comment-overlay";
import { CMS_CSS_URL, PREVIEW_CMS_CSS_HREF, PREVIEW_ROOT_VARS } from "@/lib/cms-css";

export { CMS_CSS_URL };

interface ExportContext {
   year: number;
   week: number;
   locale: string;
}

const cssStyle = `
   .custom-section {
      font-family: Lato, sans-serif;
      padding: 16px;
   }
   .custom-section__inner {
      display: flex;
      flex-direction: column;
      gap: 16px;
      align-items: center;
      max-width: 1200px;
      margin: 0 auto;
   }
   .custom-section--stack .custom-section__inner {
      text-align: center;
   }
   @media screen and (min-width: 768px) {
      .custom-section--image-left .custom-section__inner {
         flex-direction: row;
         gap: 32px;
      }
      .custom-section--image-right .custom-section__inner {
         flex-direction: row-reverse;
         gap: 32px;
      }
   }
   .custom-section__media {
      flex: 1 1 50%;
      min-width: 0;
      width: 100%;
   }
   .custom-section__content {
      flex: 1 1 50%;
      min-width: 0;
      width: 100%;
   }
   .custom-section__title {
      margin: 0 0 12px;
      font-size: 24px;
      font-weight: 800;
      line-height: 1.2;
   }
   .custom-section__text {
      margin: 0 0 12px;
      font-size: 14px;
      line-height: 1.5;
   }
   .custom-section__button {
      display: inline-block;
      margin: 0 8px 12px 0;
      padding: 10px 24px;
      background-color: #262626;
      color: #fff;
      font-weight: 700;
      font-size: 13px;
      border-radius: 24px;
      text-decoration: none;
   }
   .custom-section__button:hover {
      text-decoration: none;
      color: #fff;
      opacity: 0.9;
   }
   .custom-section__image {
      margin: 0 0 12px;
   }
   .custom-section__image img,
   .custom-section__media img {
      display: block;
      width: 100%;
      height: auto;
   }
`;

function getBlockUrl(block: CustomBlock): string {
   if (block.linkType === "cgid")
      return `$url('Search-Show','cgid','${esc(block.cgid.trim().replace(/\s/g, ""))}')$`;
   if (block.linkType === "cid")
      return `$httpsUrl('Page-Show','cid','${esc(block.cid.trim().replace(/\s/g, ""))}')$`;
   return esc(block.link.trim().replace(/\s/g, ""));
}

function hasRenderableContent(block: CustomBlock, isPreview: boolean): boolean {
   if (block.type === "image") {
      // En preview on ne peut afficher que les images choisies ;
      // à l'export le chemin CMS est émis même sans visuel dans l'app
      return isPreview ? !!block.imageUrl : true;
   }
   return !!block.text.trim();
}

function renderImageBlock(
   block: CustomBlock,
   ctx: ExportContext | null,
   wrap: boolean,
): string {
   const alt = esc(block.text.replace(/\n/g, " "));
   let inner: string;
   if (ctx) {
      const wk = String(block.imageWeek ?? ctx.week).padStart(2, "0");
      const imgPath = `homepage/${ctx.year}/wk${wk}/${ctx.locale}/custom-${esc(block.imageId)}`;
      inner = `<picture>
         <source srcset="${imgPath}.webp?$staticlink$" type="image/webp" />
         <source srcset="${imgPath}.jpg?$staticlink$" type="image/jpeg" />
         <img src="${imgPath}.jpg?$staticlink$" alt="${alt}" loading="lazy" />
      </picture>`;
   } else {
      inner = `<img src="${esc(block.imageUrl)}" alt="${alt}" />`;
   }
   return wrap ? `      <div class="custom-section__image">\n      ${inner}\n      </div>` : `      ${inner}`;
}

// ctx = null => rendu preview (vraies URLs d'images, liens neutralisés)
function renderBlock(
   block: CustomBlock,
   ctx: ExportContext | null,
   wrapImage: boolean,
): string {
   switch (block.type) {
      case "title":
         return `      <h2 class="custom-section__title">${esc(block.text).replace(/\n/g, "<br>")}</h2>`;
      case "text":
         return `      <p class="custom-section__text">${esc(block.text).replace(/\n/g, "<br>")}</p>`;
      case "button": {
         const href = ctx ? getBlockUrl(block) : "#";
         return `      <a class="custom-section__button" href="${href}">${esc(block.text)}</a>`;
      }
      case "image":
         return renderImageBlock(block, ctx, wrapImage);
   }
}

function renderSection(content: CustomContent, ctx: ExportContext | null): string {
   const isPreview = ctx === null;
   const blocks = (content.blocks ?? []).filter((b) =>
      hasRenderableContent(b, isPreview),
   );

   let innerHTML: string;
   if (content.layout === "stack") {
      // Tous les blocs dans l'ordre, sur une colonne
      const blocksHTML = blocks.map((b) => renderBlock(b, ctx, true)).join("\n");
      innerHTML = `      <div class="custom-section__content">
${blocksHTML}
      </div>`;
   } else {
      // Zone image / zone contenu, chacune dans l'ordre des blocs
      const imageBlocks = blocks.filter((b) => b.type === "image");
      const otherBlocks = blocks.filter((b) => b.type !== "image");
      const mediaHTML =
         imageBlocks.length > 0
            ? `      <div class="custom-section__media">
${imageBlocks.map((b) => renderBlock(b, ctx, false)).join("\n")}
      </div>\n`
            : "";
      innerHTML = `${mediaHTML}      <div class="custom-section__content">
${otherBlocks.map((b) => renderBlock(b, ctx, true)).join("\n")}
      </div>`;
   }

   return `<div class="custom-section custom-section--${content.layout}">
   <div class="custom-section__inner">
${innerHTML}
   </div>
</div>`;
}

export function generateCustomHTML(
   content: CustomContent,
   ctx: ExportContext,
): string {
   return `<style>
   ${cssStyle}
</style>
${renderSection(content, ctx)}`;
}

/**
 * HTML preview : vraies URLs d'images, liens neutralisés,
 * commentaire dev affiché en overlay (jamais exporté).
 * frameId : identifie l'iframe dans les messages resize (plusieurs previews
 * écoutent le même window parent — sans id elles s'écrasent mutuellement).
 */
export function generatePreviewHTML(content: CustomContent, frameId = ""): string {
   const comment = (content.comment ?? "").trim();
   const commentHtml = getPreviewCommentHtml(content.comment);
   const sectionHTML = renderSection(content, null);
   const wrapped = comment
      ? `<div class="preview-has-comment">\n${commentHtml}\n${sectionHTML}\n</div>`
      : sectionHTML;

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
${wrapped}
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

// Zero-width spaces & co (U+200B–U+200D, U+FEFF, U+00AD) copiés depuis le CMS
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
