import type { MeaItem, MeaButton } from "@/types";

export const CMS_CSS_URL =
    "https://fr.shop-orchestra.com/on/demandware.static/Sites-FR-Site/-/fr_FR/v1776150212293/css/global.css";

const BRAND_LOGO_STAGING_BASE =
    "https://fr.shop-orchestra.com/on/demandware.static/-/Library-Sites-OrchestraSharedLibrary/default/dw5f0e0dfb/logo-puericulture/";

interface ExportContext {
    year: number;
    week: number;
    locale: string;
}

function getButtonUrl(btn: MeaButton): string {
    if (btn.linkType === 'cgid') return `$url('Search-Show','cgid','${esc(btn.cgid.trim().replace(/\s/g, ""))}')$`;
    if (btn.linkType === 'cid') return `$url('Search-Show','cid','${esc(btn.cid.trim().replace(/\s/g, ""))}')$`;
    return esc(btn.link.trim());
}

function getButtonUrlPreview(btn: MeaButton): string {
    return "#";
}

export function generateMeaHTML(
    items: MeaItem[],
    ctx: ExportContext,
): string {
    const visibleItems = items.filter((item) => item.visible);

    const itemsHTML = visibleItems
        .map((item, index) => {
            const wk = String(item.imageWeek ?? ctx.week).padStart(2, "0");
            const imgPath = `homepage/${ctx.year}/wk${wk}/${ctx.locale}/mea-${index + 1}`;

            const plainTitle = esc(item.title.replace(/\n/g, " "));
            const buttons = item.buttons ?? [{ text: "Découvrir", linkType: "cgid" as const, cgid: "", cid: "", link: "" }];
            const firstUrl = getButtonUrl(buttons[0]);

            const overlayHTML = getOverlayHTML(item);
            const brandLogoHTML = getBrandLogoHTML(item, false);
            const pricingHTML = getPricingHTML(item, false);
            const buttonsHTML = buttons
                .map((btn) => `                    <a class="mea__button" href="${getButtonUrl(btn)}">${esc(btn.text)}</a>`)
                .join("\n");

            return `        <div class="mea mea--${index + 1}">
            <div class="mea__visuel">
${overlayHTML}${brandLogoHTML}                <a href="${firstUrl}" aria-label="${plainTitle}" class="mea__imgLink">
                    <picture>
                        <source srcset="${imgPath}.webp?$staticlink$" type="image/webp">
                        <source srcset="${imgPath}.jpg?$staticlink$" type="image/jpeg">
                        <img src="${imgPath}.jpg?$staticlink$" alt="${plainTitle}" class="mea__img" aria-hidden="true" style="--mea-img-opacity: ${item.imageOpacity}; --mea-img-position: ${item.imagePosition ?? 50}%;">
                    </picture>
                </a>
            </div>

            <div class="mea__infos">
                <h3 class="mea__infos-title">${plainTitle}</h3>
${pricingHTML}
                <div class="mea__buttons">
${buttonsHTML}
                </div>
            </div>
        </div>`;
        })
        .join("\n\n");

    return `<style>
    @font-face {
        font-family: "Alphakind";
        src: url("fonts/Alphakind.ttf?$staticlink$") format("truetype");
        font-weight: normal;
        font-style: normal;
    }
    .site-container {
        width: 100%;
        max-width: 100%;
        padding: 0 0.25rem;
    }
    @media screen and (min-width: 75rem) {
        .mea .mea__img {
            object-position: center;
        }
        .site-container {
            padding: 0 8%;
        }
    }
    .meas-container {
        width: 100%;
        display: grid;
        grid-gap: clamp(16px, 2.341vw + 7.216px, 40px);
        grid-template-columns: repeat(2, 1fr);
    }
    @media screen and (min-width: 75rem) {
        .meas-container {
            grid-template-columns: repeat(4, 1fr);
        }
    }
    .mea {
        display: grid;
        grid-template-columns: 100%;
        grid-template-rows: auto 1fr;
        grid-gap: 0.5rem 0;
        font-family: Lato, sans-serif;
    }
    .mea__visuel {
        position: relative;
        background-color: #000;
        overflow: hidden;
        height: 17.1875rem;
    }
    .mea__marque {
        pointer-events: none;
        width: 5.625rem;
        height: auto;
        z-index: 1;
        position: absolute;
        top: 1rem;
        left: 1rem;
    }
    .mea__imgLink {
        z-index: 1;
        display: block;
        height: 100%;
    }
    .mea__visuel picture {
        display: block;
        height: 100%;
    }
    .mea__img {
        z-index: 0;
        width: 100%;
        height: 100%;
        object-fit: cover;
        position: relative;
        opacity: var(--mea-img-opacity, 1);
        object-position: var(--mea-img-position, 50%) center;
        transition: all 0.3s ease-in-out;
    }
    .mea__infos-title {
        display: block;
        margin-bottom: 0.5rem;
        font-size: 1.125rem;
        font-weight: 800;
        line-height: 1.2;
    }
    .mea-prices {
        font-size: 0.8125rem;
    }
    .mea__club {
        font-weight: 700;
    }
    .mea__club::before {
        content: "/";
        display: inline-block;
        margin: 0 0.125rem;
        font-weight: 400;
    }
    .mea__club--no-slash::before {
        content: none;
    }
    .mea__club-label {
        margin-left: 0.25rem;
    }
    .mea__club-label-txt {
        background-color: #e32638;
        color: #fff;
        font-weight: 900;
        border-radius: 0.125rem;
        font-size: 0.625rem;
        padding: 0.125rem 0.25rem;
        display: inline-block;
    }
    .mea__club-label-img {
        width: 2.5rem;
        height: auto;
    }
    .mea__buttons {
        margin-top: 0.25rem;
        display: flex;
        flex-flow: row wrap;
        align-items: center;
        grid-gap: 0.5rem;
    }
    .mea__button {
        color: #262626;
        text-decoration: underline;
        line-height: 1.2;
        font-weight: 700;
        transition: all 0.3s ease-in-out;
    }
    .mea__visuel-texte {
        pointer-events: none;
        position: absolute;
        z-index: 1;
        bottom: 1rem;
        left: 50%;
        transform: translateX(-50%);
        padding: 0 0.5rem;
        font-family: inherit;
        text-transform: uppercase;
        font-size: 1.3125rem;
        text-align: center;
        color: #fff;
        text-shadow: 0.1875rem 0.1875rem 0.625rem #00000052;
        width: 100%;
        max-width: 18.125rem;
    }
    .mea__visuel-texte--label {
        background-color: #e32638;
        border-radius: 3.125rem;
        color: #fff;
        width: 3.4375rem;
        height: 3.4375rem;
        font-weight: 700;
        top: 0.5rem;
        left: 0.5rem;
        bottom: initial;
        transform: unset;
        text-shadow: none;
        font-family: inherit;
        padding: 0;
        font-size: 0.6rem;
        line-height: 1.2;
        font-weight: 400;
        display: flex;
        align-items: center;
        justify-content: center;
    }
    @media screen and (min-width: 75rem) {
        .mea__visuel-texte--label {
            width: 4.375rem;
            height: 4.375rem;
            font-size: 0.85rem;
        }
    }
    .d-none { display: none !important; }
</style>
<div class="site-container">
    <div class="meas-container my-5">
${itemsHTML}
    </div>
</div>`;
}

export function generatePreviewHTML(
    items: MeaItem[],
): string {
    const visibleItems = items.filter((item) => item.visible);

    const itemsHTML = visibleItems
        .map((item, index) => {
            const plainTitle = esc(item.title.replace(/\n/g, " "));
            const imgSrc = item.imageUrl || "";
            const comment = (item.comment ?? "").trim();
            const hasComment = !!comment;
            const outlineHtml = hasComment
                ? '<span class="mea__comment-outline" aria-hidden="true"></span>'
                : "";
            const commentHtml = comment
                ? `<span class="mea__comment-icon" title="${esc(comment)}" aria-label="Commentaire">i</span>`
                : "";
            const buttons = item.buttons ?? [{ text: "Découvrir", linkType: "cgid" as const, cgid: "", cid: "", link: "" }];

            const overlayHTML = getOverlayHTML(item);
            const brandLogoHTML = getBrandLogoHTML(item, true);
            const pricingHTML = getPricingHTML(item, true);
            const buttonsHTML = buttons
                .map((btn) => `                    <a class="mea__button" href="#">${esc(btn.text)}</a>`)
                .join("\n");

            return `        <div class="mea mea--${index + 1}${hasComment ? " mea--has-comment" : ""}">
${outlineHtml}
${commentHtml}
            <div class="mea__visuel">
${overlayHTML}${brandLogoHTML}                <a href="#" aria-label="${plainTitle}" class="mea__imgLink">
                    <img src="${esc(imgSrc)}" alt="${plainTitle}" class="mea__img" aria-hidden="true" style="--mea-img-opacity: ${item.imageOpacity}; --mea-img-position: ${item.imagePosition ?? 50}%;">
                </a>
            </div>

            <div class="mea__infos">
                <h3 class="mea__infos-title">${plainTitle}</h3>
${pricingHTML}
                <div class="mea__buttons">
${buttonsHTML}
                </div>
            </div>
        </div>`;
        })
        .join("\n\n");

    return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<style>
    @font-face {
        font-family: "Alphakind";
        src: url("https://fr.shop-orchestra.com/on/demandware.static/-/Library-Sites-OrchestraSharedLibrary/default/dw198cf08a/fonts/Alphakind.ttf") format("truetype");
        font-weight: normal;
        font-style: normal;
    }
    body { margin: 0; background: #fff; cursor: default; }
    .site-container {
        width: 100%;
        max-width: 100%;
        padding: 0 4px;
    }
    @media screen and (min-width: 1200px) {
        .mea .mea__img {
            object-position: top center;
        }
        .site-container {
            padding: 0 8%;
        }
    }
    .meas-container {
        width: 100%;
        display: grid;
        grid-gap: clamp(1rem, 2.341vw + 0.451rem, 2.5rem);
        grid-template-columns: repeat(2, 1fr);
    }
    @media screen and (min-width: 1200px) {
        .meas-container {
            grid-template-columns: repeat(4, 1fr);
        }
    }
    .mea {
        position: relative;
        display: grid;
        grid-template-columns: 100%;
        grid-gap: 8px 0;
        font-family: Lato, sans-serif;
        height: fit-content;
        color: #000;
    }
    .mea__visuel {
        position: relative;
        background-color: #000;
        overflow: hidden;
        height: 275px;
    }
    .mea__marque {
        pointer-events: none;
        height: 30px;
        z-index: 1;
        position: absolute;
        object-fit: contain;
        top: 16px;
        left: 16px;
    }
    .mea__imgLink {
        z-index: 1;
        display: block;
        height: 100%;
    }
    .mea__img {
        z-index: 0;
        width: 100%;
        height: 100%;
        object-fit: cover;
        position: relative;
        opacity: var(--mea-img-opacity, 1);
        object-position: var(--mea-img-position, 50%) center;
        transition: all 0.3s ease-in-out;
    }
    .mea__infos-title {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 8px;
        font-size: 18px;
        font-weight: 800;
        line-height: 1.2;
    }
    .mea__comment-icon {
        position: absolute;
        top: 0;
        right: 0;
        z-index: 999;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #fff;
        width: 22px;
        height: 22px;
        background-color: #dc2626;
        border-radius: 4px;
        font-size: 13px;
        font-weight: 700;
        font-family: Arial, sans-serif;
        line-height: 1;
        padding-top: 0;
        box-shadow: 0 1px 4px rgba(0,0,0,0.12);
    }
    .mea--has-comment {
    }
    .mea__comment-outline {
        position: absolute;
        inset: 0;
        z-index: 999;
        border: 2px solid #dc2626;
        border-radius: 4px;
        pointer-events: none;
    }
    .mea-prices {
        font-size: 13px;
    }
    .mea__club {
        font-weight: 700;
    }
    .mea__club::before {
        content: "/";
        display: inline-block;
        margin: 0 2px;
        font-weight: 400;
    }
    .mea__club--no-slash::before {
        content: none;
    }
    .mea__club-label {
        margin-left: 4px;
    }
    .mea__club-label-txt {
        background-color: #e32638;
        color: #fff;
        font-weight: 900;
        border-radius: 2px;
        font-size: 10px;
        padding: 2px 4px;
        display: inline-block;
    }
    .mea__club-label-img {
        height: 20px;
    }
    .mea__buttons {
        margin-top: 4px;
        display: flex;
        flex-flow: row wrap;
        align-items: center;
        grid-gap: 8px;
    }
    .mea__button {
        color: #262626;
        text-decoration: underline;
        line-height: 1.2;
        font-weight: 700;
        transition: all 0.3s ease-in-out;
    }
    .mea__visuel-texte {
        pointer-events: none;
        position: absolute;
        z-index: 1;
        bottom: 16px;
        left: 50%;
        transform: translateX(-50%);
        padding: 0 8px;
        font-family: inherit;
        text-transform: uppercase;
        font-size: 21px;
        text-align: center;
        color: #FFF;
        text-shadow: 3px 3px 10px #00000052;
        width: 100%;
        max-width: 290px;
    }
    .mea__visuel-texte--label {
        background-color: #e32638;
        border-radius: 50px;
        color: #fff;
        width: 55px;
        height: 55px;
        font-weight: 700;
        top: 8px;
        left: 8px;
        bottom: initial;
        transform: unset;
        text-shadow: none;
        padding: 0;
        font-size: 10px;
        line-height: 1.2;
        display: flex;
        align-items: center;
        justify-content: center;
    }
    @media screen and (min-width: 75rem) {
        .mea__visuel-texte--label {
            width: 4.375rem;
            height: 4.375rem;
            font-size: 0.85rem;
        }
    }
    .d-none { display: none !important; }
</style>
</head>
<body>
<div class="site-container">
    <div class="meas-container my-5">
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

function getOverlayHTML(item: MeaItem): string {
    if (item.overlayType === 'label') {
        return `                <div class="mea__visuel-texte mea__visuel-texte--label">\n                    ${esc(item.overlayText)}\n                </div>\n`;
    }
    if (item.overlayType === 'text') {
        return `                <div class="mea__visuel-texte">\n                    ${esc(item.overlayText).replace(/\\n/g, "<br>")}\n                </div>\n`;
    }
    return '';
}

function getBrandLogoHTML(item: MeaItem, isPreview: boolean): string {
    const dnone = item.showBrandLogo ? "" : " d-none";
    const path = item.brandLogoPath ?? "svg/premaman-blc.svg";
    const src = isPreview
        ? `${BRAND_LOGO_STAGING_BASE}${path}`
        : `logo-puericulture/${path}?$staticlink$`;
    return `                <img src="${esc(src)}" alt="Logo marque" class="mea__marque${dnone}">\n`;
}

function getPricingHTML(item: MeaItem, isPreview: boolean): string {
    const mode = item.pricingMode ?? "standard";

    // Custom mode: only prePrice text visible
    if (mode === "custom") {
        let html = `                <div class="mea-prices">\n`;
        html += `                    <span class="mea-prices__prePrice">${esc(item.customPriceText ?? "")}</span>\n`;
        html += `                    <span class="mea__initial-price d-none" price-type="initial"></span>\n`;
        html += `                    <span class="mea__club d-none" price-type="club"></span>\n`;
        html += `                </div>`;
        return html;
    }

    // Strikethrough mode: initial price struck through, club price bold, NO "/" separator
    if (mode === "strikethrough") {
        if (!item.initialPrice && !item.clubPrice) {
            return `                <div class="mea-prices d-none"></div>`;
        }
        const clubLabelClass = item.showClubLabel ? "" : " d-none";
        const clubIconClass = item.showClubIcon ? "" : " d-none";

        let html = `                <div class="mea-prices">\n`;
        html += `                    <span class="mea-prices__prePrice d-none"></span>\n`;
        if (item.initialPrice) {
            html += `                    <span class="mea__initial-price" price-type="initial" style="text-decoration: line-through;">${esc(item.initialPrice)}</span>\n`;
        }
        if (item.clubPrice) {
            // mea__club--no-slash removes the ::before "/"
            html += `                    <span class="mea__club mea__club--no-slash" price-type="club" style="font-size: 1.2em;">\n`;
            html += `                        <span class="mea__club-price">${esc(item.clubPrice)}</span>\n`;
            html += `                        <span class="mea__club-label">\n`;
            html += `                            <div class="mea__club-label-txt${clubLabelClass}">${esc(item.clubLabelText)}</div>\n`;
            const clubIconSrc = isPreview
                ? "https://fr.shop-orchestra.com/on/demandware.static/-/Library-Sites-OrchestraSharedLibrary/default/dwe6daf39c/icons/ico-club.svg"
                : "icons/ico-club.svg?$staticlink$";
            html += `                            <img src="${clubIconSrc}" alt="Club Orchestra" class="mea__club-label-img${clubIconClass}">\n`;
            html += `                        </span>\n`;
            html += `                    </span>\n`;
        }
        html += `                </div>`;
        return html;
    }

    // Standard mode
    if (!item.initialPrice && !item.clubPrice) {
        return `                <div class="mea-prices d-none"></div>`;
    }

    const prePriceClass = item.showPrePrice ? "" : " d-none";
    const clubLabelClass = item.showClubLabel ? "" : " d-none";
    const clubIconClass = item.showClubIcon ? "" : " d-none";

    const hasInitial = !!item.initialPrice.trim();
    const hasClub = !!item.clubPrice.trim();

    let html = `                <div class="mea-prices">\n`;
    html += `                    <span class="mea-prices__prePrice${prePriceClass}">${esc(item.prePriceText)}</span>\n`;
    html += `                    <span class="mea__initial-price${hasInitial ? "" : " d-none"}" price-type="initial">${esc(item.initialPrice)}</span>\n`;

    // If no initial price, add no-slash class to remove the "/" separator
    const noSlashClass = hasInitial ? "" : " mea__club--no-slash";
    html += `                    <span class="mea__club${hasClub ? "" : " d-none"}${noSlashClass}" price-type="club">\n`;
    html += `                        <span class="mea__club-price">${esc(item.clubPrice)}</span>\n`;
    html += `                        <span class="mea__club-label">\n`;
    html += `                            <div class="mea__club-label-txt${clubLabelClass}">${esc(item.clubLabelText)}</div>\n`;

    const clubIconSrc = isPreview
        ? "https://fr.shop-orchestra.com/on/demandware.static/-/Library-Sites-OrchestraSharedLibrary/default/dwe6daf39c/icons/ico-club.svg"
        : "icons/ico-club.svg?$staticlink$";
    html += `                            <img src="${clubIconSrc}" alt="Club Orchestra" class="mea__club-label-img${clubIconClass}">\n`;

    html += `                        </span>\n`;
    html += `                    </span>\n`;
    html += `                </div>`;

    return html;
}
