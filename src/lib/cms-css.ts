/** CSS global Orchestra (Bootstrap + styles site) — utilisé en export CMS et proxy preview. */
export const CMS_CSS_URL =
  "https://fr.shop-orchestra.com/on/demandware.static/Sites-FR-Site/-/fr_FR/v1776150212293/css/global.css";

/** Même origine que l'app : évite CORS / spam console dans les iframes srcdoc. */
export const PREVIEW_CMS_CSS_HREF = "/api/preview/cms-css";
