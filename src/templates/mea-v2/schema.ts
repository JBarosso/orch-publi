import type { MeaV2Card, MeaV2FocusCard, MeaV2Content } from "@/types";
import { v4 as uuidv4 } from "uuid";
import { createEmptyButton, normalizeButtons } from "../mea/schema";
import { withDefaults } from "@/lib/normalize-content";

export { createEmptyButton };

export function createEmptyMeaV2Card(id: string): MeaV2Card {
  return {
    id,
    comment: "",
    title: "",
    buttons: [createEmptyButton()],
    linkType: "cgid",
    cgid: "",
    cid: "",
    link: "",
    imageUrl: "",
    imageId: uuidv4().slice(0, 8),
    imageWeek: null,
    isGlobalImage: false,
    globalFileName: "",
    useCustomPath: false,
    customPath: "",
    showBrandLogo: false,
    brandLogoPath: "logo-puericulture/svg/premaman-blc.svg",
    showBadge: false,
    badgeText: "",
    showMarketingTitle: false,
    marketingTitle: "",
    pricingMode: "standard",
    showPrePrice: true,
    prePriceText: "À partir de",
    initialPrice: "",
    customPriceText: "",
    clubPrice: "",
    showClubLabel: true,
    clubLabelText: "Promo*",
    showClubIcon: true,
  };
}

export function createEmptyMeaV2FocusCard(id: string): MeaV2FocusCard {
  return {
    ...createEmptyMeaV2Card(id),
    mediaType: "image",
    videoUrl: "",
    videoId: uuidv4().slice(0, 8),
    appelPrix: {
      enabled: false,
      title: "",
      initialPrice: "",
      clubPrice: "",
      showClubIcon: true,
    },
  };
}

export function createEmptyMeaV2Content(): MeaV2Content {
  return {
    cards: [
      createEmptyMeaV2Card(uuidv4()),
      createEmptyMeaV2Card(uuidv4()),
      createEmptyMeaV2Card(uuidv4()),
      createEmptyMeaV2Card(uuidv4()),
    ],
    focus: createEmptyMeaV2FocusCard(uuidv4()),
  };
}

/**
 * Complète un contenu lu en base. Deux imbrications à traiter à la main, le
 * spread étant superficiel : les boutons de chaque carte, et l'objet
 * appelPrix de la carte focus (un appelPrix partiel stocké écraserait sinon
 * l'objet par défaut en entier).
 */
export function normalizeMeaV2Content(content: unknown): MeaV2Content {
  const c = (content ?? {}) as Partial<MeaV2Content>;
  const base = createEmptyMeaV2Content();

  const cards = (Array.isArray(c.cards) ? c.cards : []).map((raw) => {
    const stored = (raw ?? {}) as Partial<MeaV2Card>;
    const card = withDefaults(createEmptyMeaV2Card(stored.id ?? uuidv4()), stored);
    return { ...card, buttons: normalizeButtons(card.buttons) };
  });
  // La grille CSS suppose exactement 4 cartes : on complète si la ligne
  // stockée en contient moins (contenu créé avant ce template, ou tronqué).
  while (cards.length < base.cards.length) cards.push(createEmptyMeaV2Card(uuidv4()));

  const storedFocus = (c.focus ?? {}) as Partial<MeaV2FocusCard>;
  const focusDefaults = createEmptyMeaV2FocusCard(storedFocus.id ?? uuidv4());
  const focus: MeaV2FocusCard = {
    ...withDefaults(focusDefaults, storedFocus),
    buttons: normalizeButtons(storedFocus.buttons),
    appelPrix: withDefaults(focusDefaults.appelPrix, storedFocus.appelPrix),
  };

  return { ...c, cards, focus };
}

// "Remplie" = au moins un champ parmi titre / lien de la carte / image /
// vidéo / lien d'un bouton. Le texte de bouton par défaut ("Découvrir", cf.
// createEmptyButton) ne compte pas — sinon une carte jamais touchée serait
// déjà "remplie" — seule sa destination (cgid/cid/link) fait foi.
export function focusCardHasContent(focus: MeaV2FocusCard): boolean {
  return !!(
    focus.title.trim() ||
    focus.imageUrl ||
    focus.videoUrl ||
    focus.cgid.trim() ||
    focus.cid.trim() ||
    focus.link.trim() ||
    focus.buttons.some((b) => b.cgid.trim() || b.cid.trim() || b.link.trim())
  );
}

export function validateMeaV2Content(content: MeaV2Content): string[] {
  const errors: string[] = [];
  (content.cards ?? []).forEach((card, i) => {
    if (!card.title.trim()) errors.push(`MEA v2 carte ${i + 1}: Titre requis`);
    if (!card.imageUrl) errors.push(`MEA v2 carte ${i + 1}: Image requise`);
  });
  const focus = content.focus;
  // Carte focus optionnelle : laissée entièrement vierge, elle n'est pas
  // générée à l'export (cf. generateMeaV2HTML) — pas d'erreur dans ce cas.
  // Dès qu'un champ est renseigné, elle redevient soumise aux mêmes règles
  // que les cartes classiques (sinon elle serait générée incomplète/cassée).
  if (focus && focusCardHasContent(focus)) {
    if (!focus.title.trim()) errors.push("MEA v2 carte focus: Titre requis");
    if (!focus.imageUrl) errors.push("MEA v2 carte focus: Image (vignette) requise");
    if (focus.mediaType === "video" && !focus.videoUrl) {
      errors.push("MEA v2 carte focus: Vidéo requise (mode vidéo activé)");
    }
  }
  return errors;
}
