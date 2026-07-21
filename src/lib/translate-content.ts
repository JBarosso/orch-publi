import type {
  ArianeContent,
  CarouselContent,
  CarouselSlide,
  CustomContent,
  EditoCard,
  EditoContent,
  GlobalHeaderContent,
  GlobalHeaderItem,
  Locale,
  MacaronsContent,
  MeaContent,
  MeaItem,
  MeaV2Content,
  MeaV2Card,
} from "@/types";

// Traduction du contenu des sections lors d'une duplication inter-langues.
// Substitution par correspondance exacte (normalisée) sur le glossaire :
// valeur langue source -> valeur langue cible.
// Les textes introuvables ou ambigus restent en langue source et sont
// signalés via le commentaire dev de l'item (bordure rouge dans l'éditeur).

export interface GlossaryEntry {
  key: string;
  values: Partial<Record<Locale, string>>;
}

export interface TranslateStats {
  translated: number;
  missing: number;
  ambiguous: number;
}

const AMBIGUOUS = Symbol("ambiguous");

// Zero-width spaces & co (U+200B–U+200D, U+FEFF) : présents dans les textes
// copiés depuis le CMS, invisibles à l'écran mais cassent les comparaisons
const INVISIBLE_CHARS = new RegExp(
  `[${String.fromCharCode(0x200b)}-${String.fromCharCode(0x200d)}${String.fromCharCode(0xfeff)}]`,
  "g",
);

function norm(s: string): string {
  return s
    .normalize("NFC")
    .replace(INVISIBLE_CHARS, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

// Si le texte source était entièrement en minuscules (usage macarons),
// la traduction adopte le même style ; sinon on garde la casse du glossaire
function matchCaseStyle(source: string, translated: string): string {
  return source === source.toLowerCase() ? translated.toLowerCase() : translated;
}

// Map texte source normalisé -> traduction cible (ou AMBIGUOUS si plusieurs
// entrées du glossaire donnent des traductions différentes pour le même texte)
export function buildTranslationLookup(
  entries: GlossaryEntry[],
  source: Locale,
  target: Locale,
): Map<string, string | typeof AMBIGUOUS> {
  const map = new Map<string, string | typeof AMBIGUOUS>();
  for (const entry of entries) {
    const src = entry.values[source];
    const tgt = entry.values[target];
    if (!src || !tgt) continue;
    const key = norm(src);
    const existing = map.get(key);
    if (existing === undefined) {
      map.set(key, tgt);
    } else if (existing !== AMBIGUOUS && norm(existing) !== norm(tgt)) {
      map.set(key, AMBIGUOUS);
    }
  }
  return map;
}

type Lookup = ReturnType<typeof buildTranslationLookup>;

interface FieldResult {
  value: string;
  status: "translated" | "missing" | "ambiguous" | "skipped";
}

function translateField(value: string, lookup: Lookup): FieldResult {
  if (!value.trim()) return { value, status: "skipped" };
  const found = lookup.get(norm(value));
  if (found === undefined) return { value, status: "missing" };
  if (found === AMBIGUOUS) return { value, status: "ambiguous" };
  return { value: matchCaseStyle(value, found), status: "translated" };
}

const NOTE_PREFIX = "[Traduction]";

function appendNote(comment: string, notes: string[]): string {
  if (notes.length === 0) return comment;
  const note = `${NOTE_PREFIX} À vérifier : ${notes.join(", ")}`;
  return comment ? `${comment}\n${note}` : note;
}

// Traduit un champ, comptabilise le résultat et alimente les notes de l'item
function applyField(
  value: string,
  fieldLabel: string,
  lookup: Lookup,
  stats: TranslateStats,
  notes: string[],
): string {
  const result = translateField(value, lookup);
  if (result.status === "translated") stats.translated++;
  if (result.status === "missing") {
    stats.missing++;
    notes.push(`${fieldLabel} (non trouvé dans le glossaire)`);
  }
  if (result.status === "ambiguous") {
    stats.ambiguous++;
    notes.push(`${fieldLabel} (plusieurs traductions possibles)`);
  }
  return result.value;
}

function translateMacaronsContent(
  content: MacaronsContent,
  lookup: Lookup,
  stats: TranslateStats,
): MacaronsContent {
  return {
    ...content,
    items: (content.items ?? []).map((item) => {
      const notes: string[] = [];
      const wasTranslated =
        translateField(item.label, lookup).status === "translated";
      const label = applyField(item.label, "label", lookup, stats, notes);
      // Contrainte macarons : 16 caractères max
      if (wasTranslated && label.length > 16) {
        notes.push(`label traduit trop long (${label.length}/16 caractères)`);
      }
      return { ...item, label, comment: appendNote(item.comment, notes) };
    }),
  };
}

function translateMeaContent(
  content: MeaContent,
  lookup: Lookup,
  stats: TranslateStats,
): MeaContent {
  return {
    ...content,
    items: (content.items ?? []).map((item) => {
      const notes: string[] = [];
      const translated: MeaItem = {
        ...item,
        title: applyField(item.title, "titre", lookup, stats, notes),
        overlayText: applyField(item.overlayText, "texte overlay", lookup, stats, notes),
        prePriceText: applyField(item.prePriceText, "texte avant-prix", lookup, stats, notes),
        customPriceText: applyField(item.customPriceText, "texte prix custom", lookup, stats, notes),
        clubLabelText: applyField(item.clubLabelText, "label club", lookup, stats, notes),
        buttons: (item.buttons ?? []).map((button, i) => ({
          ...button,
          text: applyField(
            button.text,
            item.buttons.length > 1 ? `bouton ${i + 1}` : "bouton",
            lookup,
            stats,
            notes,
          ),
        })),
      };
      return { ...translated, comment: appendNote(item.comment, notes) };
    }),
  };
}

const CUSTOM_FIELD_LABELS: Record<string, string> = {
  title: "titre",
  text: "texte",
  button: "bouton",
};

// Sections personnalisées : le commentaire est au niveau de la section,
// les notes de traduction y sont donc regroupées. Les blocs image (texte
// alternatif rarement dans le glossaire) ne sont pas traduits.
function translateCustomContent(
  content: CustomContent,
  lookup: Lookup,
  stats: TranslateStats,
): CustomContent {
  const notes: string[] = [];
  const blocks = (content.blocks ?? []).map((block, i) => {
    if (block.type === "image" || !block.text.trim()) return block;
    const label = `bloc ${i + 1} (${CUSTOM_FIELD_LABELS[block.type] ?? block.type})`;
    return {
      ...block,
      text: applyField(block.text, label, lookup, stats, notes),
    };
  });
  return {
    ...content,
    blocks,
    comment: appendNote(content.comment ?? "", notes),
  };
}

// Traduit une carte MEA v2 (régulière ou focus) : titre + textes de boutons.
// Les prix et l'URL image/vidéo ne sont jamais traduits. Générique sur T pour
// préserver les champs propres à MeaV2FocusCard (mediaType, videoUrl...).
function translateMeaV2Card<T extends MeaV2Card>(
  card: T,
  lookup: Lookup,
  stats: TranslateStats,
): T {
  const notes: string[] = [];
  const title = applyField(card.title, "titre", lookup, stats, notes);
  const buttons = (card.buttons ?? []).map((button, i) => ({
    ...button,
    text: applyField(
      button.text,
      card.buttons.length > 1 ? `bouton ${i + 1}` : "bouton",
      lookup,
      stats,
      notes,
    ),
  }));
  return { ...card, title, buttons, comment: appendNote(card.comment, notes) } as T;
}

function translateMeaV2Content(
  content: MeaV2Content,
  lookup: Lookup,
  stats: TranslateStats,
): MeaV2Content {
  const cards = (content.cards ?? []).map((card) => translateMeaV2Card(card, lookup, stats));

  const focus = content.focus;
  if (!focus) return { ...content, cards };

  const translatedFocus = translateMeaV2Card(focus, lookup, stats);
  const focusNotes: string[] = [];
  const appelPrixTitle = focus.appelPrix?.enabled
    ? applyField(focus.appelPrix.title, "titre badge prix", lookup, stats, focusNotes)
    : focus.appelPrix?.title ?? "";

  return {
    ...content,
    cards,
    focus: {
      ...translatedFocus,
      comment: appendNote(translatedFocus.comment, focusNotes),
      appelPrix: { ...focus.appelPrix, title: appelPrixTitle },
    },
  };
}

// Fil d'ariane : titre + libellé de chaque lien. Notes regroupées sur le
// commentaire de section, comme les sections personnalisées.
function translateArianeContent(
  content: ArianeContent,
  lookup: Lookup,
  stats: TranslateStats,
): ArianeContent {
  const notes: string[] = [];
  const title = applyField(content.title, "titre", lookup, stats, notes);
  const links = (content.links ?? []).map((link, i) => ({
    ...link,
    label: applyField(link.label, `lien ${i + 1}`, lookup, stats, notes),
  }));
  return { ...content, title, links, comment: appendNote(content.comment, notes) };
}

// Edito : titre + texte + textes de boutons par carte.
function translateEditoCard(
  card: EditoCard,
  lookup: Lookup,
  stats: TranslateStats,
): EditoCard {
  const notes: string[] = [];
  const title = applyField(card.title, "titre", lookup, stats, notes);
  const text = applyField(card.text, "texte", lookup, stats, notes);
  const buttons = (card.buttons ?? []).map((button, i) => ({
    ...button,
    text: applyField(
      button.text,
      card.buttons.length > 1 ? `bouton ${i + 1}` : "bouton",
      lookup,
      stats,
      notes,
    ),
  }));
  return { ...card, title, text, buttons, comment: appendNote(card.comment, notes) };
}

function translateEditoContent(
  content: EditoContent,
  lookup: Lookup,
  stats: TranslateStats,
): EditoContent {
  return {
    ...content,
    items: (content.items ?? []).map((card) => translateEditoCard(card, lookup, stats)),
  };
}

// Carousel : titre (texte), textes de boutons, libellé + badge promo du
// callout produit. Jamais les prix ni les images/vidéo.
function translateCarouselSlide(
  slide: CarouselSlide,
  lookup: Lookup,
  stats: TranslateStats,
): CarouselSlide {
  const notes: string[] = [];
  const titleText =
    slide.titleType === "text"
      ? applyField(slide.titleText, "titre", lookup, stats, notes)
      : slide.titleText;
  const buttons = (slide.buttons ?? []).map((button, i) => ({
    ...button,
    text: applyField(
      button.text,
      slide.buttons.length > 1 ? `bouton ${i + 1}` : "bouton",
      lookup,
      stats,
      notes,
    ),
  }));
  const callout = slide.productCallout;
  const productCallout = callout.enabled
    ? {
        ...callout,
        label: applyField(callout.label, "libellé callout", lookup, stats, notes),
        promoBadgeText: callout.showPromoBadge
          ? applyField(callout.promoBadgeText, "badge promo", lookup, stats, notes)
          : callout.promoBadgeText,
      }
    : callout;
  return {
    ...slide,
    titleText,
    buttons,
    productCallout,
    comment: appendNote(slide.comment, notes),
  };
}

function translateCarouselContent(
  content: CarouselContent,
  lookup: Lookup,
  stats: TranslateStats,
): CarouselContent {
  return {
    ...content,
    slides: (content.slides ?? []).map((slide) => translateCarouselSlide(slide, lookup, stats)),
  };
}

// Global header : uniquement le texte du message. Jamais le lien, ni le
// label (identifiant de bibliothèque, pas un contenu affiché).
function translateGlobalHeaderItem(
  item: GlobalHeaderItem,
  lookup: Lookup,
  stats: TranslateStats,
): GlobalHeaderItem {
  const notes: string[] = [];
  const text = applyField(item.text, "texte", lookup, stats, notes);
  return { ...item, text, comment: appendNote(item.comment, notes) };
}

function translateGlobalHeaderContent(
  content: GlobalHeaderContent,
  lookup: Lookup,
  stats: TranslateStats,
): GlobalHeaderContent {
  return {
    ...content,
    items: (content.items ?? []).map((item) => translateGlobalHeaderItem(item, lookup, stats)),
  };
}

export function translateSectionContent(
  type: string,
  content: unknown,
  lookup: Lookup,
  stats: TranslateStats,
): unknown {
  if (type === "macarons" || type === "macarons_v2") {
    return translateMacaronsContent(content as MacaronsContent, lookup, stats);
  }
  if (type === "mea") {
    return translateMeaContent(content as MeaContent, lookup, stats);
  }
  if (type === "mea_v2") {
    return translateMeaV2Content(content as MeaV2Content, lookup, stats);
  }
  if (type === "custom") {
    return translateCustomContent(content as CustomContent, lookup, stats);
  }
  if (type === "ariane") {
    return translateArianeContent(content as ArianeContent, lookup, stats);
  }
  if (type === "edito") {
    return translateEditoContent(content as EditoContent, lookup, stats);
  }
  if (type === "carousel") {
    return translateCarouselContent(content as CarouselContent, lookup, stats);
  }
  if (type === "global_header") {
    return translateGlobalHeaderContent(content as GlobalHeaderContent, lookup, stats);
  }
  return content;
}
