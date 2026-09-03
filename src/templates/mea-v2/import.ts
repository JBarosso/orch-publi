import { v4 as uuidv4 } from "uuid";
import type { MeaButton, MeaPricingMode, MeaV2Card, MeaV2Content, MeaV2FocusCard } from "@/types";
import {
  hasClass,
  isEmptyCmsLink,
  parseCmsImagePath,
  parseCmsLink,
  parseHtmlFragment,
  resolveGlobalImageFields,
  textOf,
  type ParsedCmsImagePath,
} from "@/lib/parse-cms-html";
import { createEmptyButton } from "../mea/schema";
import { createEmptyMeaV2Card, createEmptyMeaV2FocusCard } from "./schema";

export interface ImportMeaV2Result {
  content: MeaV2Content;
  issueCount: number;
}

type PricingFields = Pick<
  MeaV2Card,
  | "pricingMode"
  | "showPrePrice"
  | "prePriceText"
  | "initialPrice"
  | "customPriceText"
  | "clubPrice"
  | "showClubLabel"
  | "clubLabelText"
  | "showClubIcon"
>;

function decodeBreaksToLiteralNewlines(doc: Document, el: Element | null): string {
  if (!el) return "";
  // Inverse de esc(text).replace(/\\n/g, "<br/>") côté export : remettre les
  // "\n" littéraux avant de laisser le DOM décoder les entités HTML restantes.
  const withMarkers = el.innerHTML.replace(/<br\s*\/?>/gi, "\\n");
  const tmp = doc.createElement("div");
  tmp.innerHTML = withMarkers;
  return (tmp.textContent ?? "").trim();
}

function parseButtons(scope: Element): { buttons: MeaButton[]; issue: boolean } {
  const nodes = Array.from(scope.querySelectorAll(".hp-cat-header-mea__button"));
  if (nodes.length === 0) return { buttons: [createEmptyButton()], issue: true };
  const buttons = nodes.map((a) => {
    const link = parseCmsLink(a.getAttribute("href"));
    return { text: textOf(a), linkType: link.linkType, cgid: link.cgid, cid: link.cid, link: link.link };
  });
  return { buttons, issue: buttons.every((b) => isEmptyCmsLink(b)) };
}

// Signatures DOM par mode, cf. getPricingHTML (src/templates/mea/export.ts) :
// - custom : prePrice sans "d-none" et span club vide (pas de .mea__club-price)
// - strikethrough : initial avec "text-decoration: line-through", ou club en
//   "mea__club--no-slash" / font-size 1.2em
// - standard : tout le reste (les deux spans toujours présents, togglés en d-none)
function parsePricing(pricesEl: Element | null): PricingFields {
  const defaults: PricingFields = {
    pricingMode: "standard",
    showPrePrice: true,
    prePriceText: "",
    initialPrice: "",
    customPriceText: "",
    clubPrice: "",
    showClubLabel: true,
    clubLabelText: "",
    showClubIcon: true,
  };
  if (!pricesEl || hasClass(pricesEl, "d-none")) return defaults;

  const prePriceEl = pricesEl.querySelector(".mea-prices__prePrice");
  const initialEl = pricesEl.querySelector('[price-type="initial"]');
  const clubEl = pricesEl.querySelector('[price-type="club"]');
  const clubPriceEl = clubEl?.querySelector(".mea__club-price") ?? null;

  const isCustom = !!prePriceEl && !hasClass(prePriceEl, "d-none") && !clubPriceEl;
  if (isCustom) {
    return { ...defaults, pricingMode: "custom", customPriceText: textOf(prePriceEl) };
  }

  const isStrikethrough =
    (initialEl?.getAttribute("style") ?? "").includes("line-through") ||
    hasClass(clubEl, "mea__club--no-slash") ||
    /1\.2em/.test(clubEl?.getAttribute("style") ?? "");

  const clubLabelEl = clubEl?.querySelector(".mea__club-label-txt") ?? null;
  const clubIconEl = clubEl?.querySelector(".mea__club-label-img") ?? null;
  const pricingMode: MeaPricingMode = isStrikethrough ? "strikethrough" : "standard";

  return {
    pricingMode,
    showPrePrice: prePriceEl ? !hasClass(prePriceEl, "d-none") : true,
    prePriceText: textOf(prePriceEl),
    initialPrice: textOf(initialEl),
    customPriceText: "",
    clubPrice: textOf(clubPriceEl),
    showClubLabel: clubLabelEl ? !hasClass(clubLabelEl, "d-none") : true,
    clubLabelText: textOf(clubLabelEl),
    showClubIcon: clubIconEl ? !hasClass(clubIconEl, "d-none") : true,
  };
}

function imageWeekFrom(imagePath: ParsedCmsImagePath | null, briefWeek: number): number | null {
  return imagePath && imagePath.week !== briefWeek ? imagePath.week : null;
}

function parseRegularCard(
  doc: Document,
  node: Element,
  index: number,
  briefWeek: number,
): { card: MeaV2Card; issueCount: number } {
  const base = createEmptyMeaV2Card(uuidv4());
  const issues: string[] = [];

  const title = textOf(node.querySelector(".hp-cat-header-mea__title:not(.marketing)"));
  if (!title) issues.push("titre introuvable");

  const imagePath = parseCmsImagePath(node.querySelector(".hp-cat-header-mea__picture img")?.getAttribute("src"));
  if (!imagePath) issues.push("chemin d'image non reconnu — image à resélectionner");
  const { isGlobalImage, globalFileName } = resolveGlobalImageFields(imagePath, `mea-${index + 1}`);

  const link = parseCmsLink(node.querySelector(".hp-cat-header__link")?.getAttribute("href"));
  if (isEmptyCmsLink(link)) issues.push("lien de la carte introuvable");

  const { buttons, issue: buttonsIssue } = parseButtons(node);
  if (buttonsIssue) issues.push("boutons introuvables");

  const logoEl = node.querySelector<HTMLImageElement>(".hp-cat-header-mea__marque");
  const badgeEl = node.querySelector(".hp-cat-header-mea__badge");
  const marketingEl = node.querySelector(".hp-cat-header-mea__title.marketing");
  const pricesEl = node.querySelector(".mea-prices");

  const card: MeaV2Card = {
    ...base,
    title,
    buttons,
    linkType: link.linkType,
    cgid: link.cgid,
    cid: link.cid,
    link: link.link,
    imageWeek: imageWeekFrom(imagePath, briefWeek),
    isGlobalImage,
    globalFileName,
    showBrandLogo: logoEl ? !hasClass(logoEl, "d-none") : base.showBrandLogo,
    brandLogoPath: logoEl ? (logoEl.getAttribute("src") ?? "").split("?")[0] : base.brandLogoPath,
    showBadge: badgeEl ? !hasClass(badgeEl, "d-none") : base.showBadge,
    badgeText: badgeEl ? textOf(badgeEl) : base.badgeText,
    showMarketingTitle: marketingEl ? !hasClass(marketingEl, "d-none") : base.showMarketingTitle,
    marketingTitle: marketingEl ? decodeBreaksToLiteralNewlines(doc, marketingEl) : base.marketingTitle,
    ...parsePricing(pricesEl),
    comment: issues.length > 0 ? `Import CMS : ${issues.join(", ")}.` : "",
  };

  return { card, issueCount: issues.length > 0 ? 1 : 0 };
}

function parseFocusCard(doc: Document, node: Element | null, briefWeek: number): { focus: MeaV2FocusCard; issueCount: number } {
  const base = createEmptyMeaV2FocusCard(uuidv4());
  if (!node) return { focus: base, issueCount: 0 };

  const issues: string[] = [];
  const title = textOf(node.querySelector(".hp-cat-header-mea__title"));
  if (!title) issues.push("titre introuvable");

  const link = parseCmsLink(node.querySelector(".hp-cat-header__link")?.getAttribute("href"));
  if (isEmptyCmsLink(link)) issues.push("lien de la carte introuvable");

  const { buttons, issue: buttonsIssue } = parseButtons(node);
  if (buttonsIssue) issues.push("boutons introuvables");

  const videoEl = node.querySelector<HTMLVideoElement>("video.hp-cat-header-mea__video");
  const isVideo = !!videoEl;
  const imagePath = isVideo
    ? parseCmsImagePath(videoEl?.getAttribute("poster"))
    : parseCmsImagePath(node.querySelector(".hp-cat-header-mea__picture img")?.getAttribute("src"));
  if (!imagePath) issues.push("chemin d'image/vignette non reconnu — média à resélectionner");
  if (isVideo) issues.push("vidéo à réuploader (le fichier n'est pas récupérable depuis le code CMS)");
  const { isGlobalImage, globalFileName } = resolveGlobalImageFields(imagePath, "mea-5");

  const appelPrixEl = node.querySelector(".hp-cat-header-mea__appelPrix");

  const focus: MeaV2FocusCard = {
    ...base,
    title,
    buttons,
    linkType: link.linkType,
    cgid: link.cgid,
    cid: link.cid,
    link: link.link,
    imageWeek: imageWeekFrom(imagePath, briefWeek),
    isGlobalImage,
    globalFileName,
    mediaType: isVideo ? "video" : "image",
    appelPrix: appelPrixEl
      ? {
          enabled: true,
          title: textOf(appelPrixEl.querySelector(".hp-cat-header-mea__appelPrix-title")),
          initialPrice: textOf(appelPrixEl.querySelector(".hp-cat-header-mea__appelPrix-price-initial")),
          clubPrice: textOf(appelPrixEl.querySelector(".hp-cat-header-mea__appelPrix-price-club-value")),
          showClubIcon: !!appelPrixEl.querySelector(".hp-cat-header-mea__appelPrix-price-club-icon"),
        }
      : base.appelPrix,
    comment: issues.length > 0 ? `Import CMS : ${issues.join(", ")}.` : "",
  };

  return { focus, issueCount: issues.length > 0 ? 1 : 0 };
}

/**
 * Reconstruit les 4 cartes + la carte focus MEA v2 à partir du HTML déjà
 * exporté vers le CMS. Les images/vidéos ne sont jamais récupérées (elles
 * vivent côté CMS, pas dans notre médiathèque) : semaine + position sont
 * figées pour que le prochain export continue de pointer vers les fichiers
 * existants, et chaque champ non reconnu est signalé dans le commentaire de
 * la carte concernée plutôt que de bloquer l'import.
 */
export function parseMeaV2HTML(html: string, briefWeek: number): ImportMeaV2Result {
  const doc = parseHtmlFragment(html);
  const allCards = Array.from(doc.querySelectorAll(".hp-cat-header-mea"));
  const focusNode = doc.querySelector(".hp-cat-header--focus");
  const regularNodes = allCards.filter((n) => !hasClass(n, "hp-cat-header--focus"));

  if (regularNodes.length === 0 && !focusNode) {
    throw new Error("Aucune carte MEA v2 reconnue dans le code collé.");
  }

  let issueCount = 0;
  const cards: MeaV2Card[] = [];
  for (let i = 0; i < 4; i += 1) {
    if (regularNodes[i]) {
      const { card, issueCount: n } = parseRegularCard(doc, regularNodes[i], i, briefWeek);
      cards.push(card);
      issueCount += n;
    } else {
      const card = createEmptyMeaV2Card(uuidv4());
      card.comment = "Import CMS : carte absente du code collé.";
      cards.push(card);
      issueCount += 1;
    }
  }
  if (regularNodes.length > 4) {
    cards[3].comment = [cards[3].comment, "Import CMS : cartes en trop dans le code collé, ignorées au-delà de 4."]
      .filter(Boolean)
      .join(" ");
    issueCount += 1;
  }

  const { focus, issueCount: focusIssues } = parseFocusCard(doc, focusNode, briefWeek);
  issueCount += focusIssues;

  return { content: { cards, focus }, issueCount };
}
