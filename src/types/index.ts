export type BriefStatus = "draft" | "published" | "treated";

export type SectionType =
  | "macarons"
  | "mea"
  | "custom"
  | "macarons_v2"
  | "mea_v2"
  | "ariane"
  | "edito"
  | "carousel"
  | "global_header"
  | "img_sous_menu"
  | "cat_banner"
  | "miniature_offre"
  | "moodboard";
export type AssetType =
  | "macaron"
  | "mea"
  | "other"
  | "macaron_v2"
  | "mea_v2"
  | "mea_v2_focus"
  | "mea_v2_video"
  | "mea_v2_logo"
  | "edito"
  | "carousel"
  | "carousel_title"
  | "carousel_video"
  | "img_sous_menu"
  | "cat_banner_desktop"
  | "cat_banner_mobile"
  | "miniature_offre"
  | "moodboard";

export type Locale = "FR" | "BEFR" | "BENL" | "GR" | "ES";

export const LOCALES: { value: Locale; label: string }[] = [
  { value: "BEFR", label: "BEFR" },
  { value: "BENL", label: "BENL" },
  { value: "ES", label: "ES" },
  { value: "FR", label: "FR" },
  { value: "GR", label: "GR" },
];

export const STATUS_CONFIG: Record<
  BriefStatus,
  { label: string; color: string; dot: string }
> = {
  draft: { label: "Brouillon", color: "bg-amber-50 text-amber-700 border-amber-200", dot: "bg-amber-400" },
  published: { label: "Publié", color: "bg-emerald-50 text-emerald-700 border-emerald-200", dot: "bg-emerald-400" },
  treated: { label: "Traité", color: "bg-sky-50 text-sky-700 border-sky-200", dot: "bg-sky-400" },
};

export interface Brief {
  id: string;
  slug: string;
  name: string;
  year: number;
  week: number;
  locale: Locale;
  index: number;
  status: BriefStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface BriefSection {
  id: string;
  briefId: string;
  type: SectionType;
  title: string;
  order: number;
  content: unknown;
  visible: boolean;
  /** Page du site visée (onglet Assets CMS) — l'asset en est déduit. */
  cmsPageId: string | null;
  /** Identifiant d'asset saisi à la main, prioritaire ("" = déduire). */
  cmsAssetId: string;
  createdAt: Date;
  updatedAt: Date;
}

/** Page du site et asset Salesforce de chaque type de section qu'elle porte. */
export interface CmsPage {
  id: string;
  name: string;
  assets: Partial<Record<SectionType, string>>;
}

// --- Programmation : tableau informatif, blocs (nom d'asset + période
// optionnelle) rangés en colonnes par pays. ---

// Aligné sur Locale (BE distingue déjà FR/NL partout ailleurs dans l'appli)
export type ProgrammationCountry = "FR" | "BEFR" | "BENL" | "ES" | "GR";

export const PROGRAMMATION_COUNTRIES: { value: ProgrammationCountry; label: string }[] = [
  { value: "FR", label: "FR" },
  { value: "BEFR", label: "BE FR" },
  { value: "BENL", label: "BE NL" },
  { value: "ES", label: "ES" },
  { value: "GR", label: "GR" },
];

export interface ProgrammationBlock {
  id: string;
  country: ProgrammationCountry;
  label: string;
  // "YYYY-MM-DD", ou null si non renseignée (les deux dates sont optionnelles)
  startDate: string | null;
  endDate: string | null;
  comment: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Asset {
  id: string;
  url: string;
  type: AssetType;
  label: string;
  mimeType: string;
  year: number | null;
  week: number | null;
  /** URL d'origine si glissée depuis une appli web (ex: SharePoint) */
  originUrl: string | null;
  createdAt: Date;
}

export interface TranslationEntry {
  id: string;
  key: string;
  // Valeur par code langue (aligné sur les locales des briefs)
  values: Partial<Record<Locale, string>>;
  createdAt: Date;
  updatedAt: Date;
}

export interface MacaronItem {
  id: string;
  label: string;
  comment: string;
  linkType: "cgid" | "url" | "cid";
  cgid: string;
  cid: string;
  link: string;
  imageUrl: string;
  imageId: string;
  imageWeek: number | null;
  // Position figée dans l'export (quickaccess-{N}) quand imageWeek diffère de
  // la semaine du brief — l'item ne se renumérote plus s'il est déplacé.
  // null = natif de la semaine du brief : la position suit son index actuel.
  exportPosition: number | null;
  visible: boolean;
  // Image "globale" (quickaccess v2 uniquement, UI masquée en v1) : chemin CMS
  // sans segment locale (homepage/{year}/wk{week}/{nom} au lieu de
  // .../{locale}/{nom}). globalFileName remplace le nom par défaut
  // (quickaccess-{N}) quand renseigné — seul le nom change, .jpg/.webp restent.
  isGlobalImage: boolean;
  globalFileName: string;
  // Chemin CMS personnalisé : remplace tout ce qui précède le segment langue
  // (homepage/{année}/wk{semaine} par défaut). Toggle actif + champ vide =
  // on hérite du chemin défini au niveau de la section.
  useCustomPath: boolean;
  customPath: string;
}

/**
 * Emplacement CMS d'un quickaccess v2. Le même composant vit sur la page
 * d'accueil et sur les pages catégorie niveau 2, avec des classes scopées
 * différentes de chaque côté : exporter les mauvaises laisse la section sans
 * style sur la page de destination.
 */
export type QuickaccessPlacement = "homepage" | "cat_lvl2";

export interface MacaronsContent {
  items: MacaronItem[];
  // Chemin CMS personnalisé partagé par les items de la section (quickaccess
  // v2) — chaque item peut le surcharger. Absent des contenus créés avant.
  customPath?: string;
  // Absent des contenus créés avant : traité comme "homepage", l'export
  // historique, pour ne rien changer aux sections existantes.
  placement?: QuickaccessPlacement;
}

export type MeaOverlayType = "none" | "label" | "text";

export type MeaPricingMode = "standard" | "strikethrough" | "custom";

export interface MeaItem {
  id: string;
  visible: boolean;
  comment: string;

  // Image
  imageUrl: string;
  imageId: string;
  imageWeek: number | null;
  // Position figée dans l'export (mea-{N}) quand imageWeek diffère de la
  // semaine du brief — ne pas confondre avec imagePosition (cadrage visuel).
  // null = natif de la semaine du brief : la position suit l'index actuel.
  exportPosition: number | null;
  imageOpacity: number; // e.g. 1 or 0.9
  imagePosition: number; // 0-100, horizontal position %

  // Brand Logo
  showBrandLogo: boolean;
  brandLogoPath: string; // path segment between logo-puericulture/ and ?$staticlink$

  // Overlay
  overlayType: MeaOverlayType;
  overlayText: string;

  // Information
  title: string;

  // Pricing
  pricingMode: MeaPricingMode;
  showPrePrice: boolean;
  prePriceText: string;
  initialPrice: string;
  customPriceText: string;

  // Club Pricing
  clubPrice: string;
  showClubLabel: boolean;
  clubLabelText: string;
  showClubIcon: boolean;

  // Buttons & Link
  buttons: MeaButton[];
}

export interface MeaButton {
  text: string;
  linkType: "cgid" | "url" | "cid";
  cgid: string;
  cid: string;
  link: string;
}

export interface MeaContent {
  items: MeaItem[];
}

// --- Templates personnalisés (sections à champs libres) ---

export type CustomTemplateStatus = "draft" | "published" | "archived";

export const TEMPLATE_STATUS_CONFIG: Record<
  CustomTemplateStatus,
  { label: string; color: string; dot: string }
> = {
  draft: { label: "Brouillon", color: "bg-amber-50 text-amber-700 border-amber-200", dot: "bg-amber-400" },
  published: { label: "Publié", color: "bg-emerald-50 text-emerald-700 border-emerald-200", dot: "bg-emerald-400" },
  archived: { label: "Archivé", color: "bg-slate-100 text-slate-600 border-slate-200", dot: "bg-slate-400" },
};

export type CustomLayout = "stack" | "image-left" | "image-right";

export const CUSTOM_LAYOUTS: { value: CustomLayout; label: string }[] = [
  { value: "stack", label: "Empilé (blocs dans l'ordre)" },
  { value: "image-right", label: "Image à droite, contenu à gauche" },
  { value: "image-left", label: "Image à gauche, contenu à droite" },
];

export type CustomBlockType = "title" | "text" | "image" | "button";

export const CUSTOM_BLOCK_LABELS: Record<CustomBlockType, string> = {
  title: "Titre",
  text: "Texte",
  image: "Image",
  button: "Bouton",
};

export interface CustomBlock {
  id: string;
  type: CustomBlockType;
  // Titre, paragraphe, libellé du bouton ou texte alternatif de l'image
  text: string;
  // Image
  imageUrl: string;
  imageId: string;
  imageWeek: number | null;
  // Lien (bouton)
  linkType: "cgid" | "url" | "cid";
  cgid: string;
  cid: string;
  link: string;
}

export interface CustomContent {
  layout: CustomLayout;
  comment: string;
  blocks: CustomBlock[];
}

export interface CustomTemplate {
  id: string;
  name: string;
  status: CustomTemplateStatus;
  layout: CustomLayout;
  blocks: CustomBlock[];
  createdAt: Date;
  updatedAt: Date;
}

// --- MEA v2 (nouveau design system, 4 cartes fixes + 1 carte focus vidéo) ---
// Quickaccess v2 (macarons_v2) réutilise MacaronItem/MacaronsContent tel quel :
// même forme (label, lien, image) — seul l'export (CSS/dimensions/chemins) change.

export interface MeaV2Card {
  id: string;
  comment: string;
  title: string;
  buttons: MeaButton[];
  // Lien "fantôme" : toute la carte est cliquable, indépendamment des boutons
  // (ex. HTML fourni : carte MEA2 a des boutons bébé fille/garçon mais le clic
  // sur la carte pointe vers une sélection denim commune aux deux).
  linkType: "cgid" | "url" | "cid";
  cgid: string;
  cid: string;
  link: string;
  imageUrl: string;
  imageId: string;
  imageWeek: number | null;
  // Image "globale" : chemin CMS sans segment locale
  // (homepage/{year}/wk{week}/{nom} au lieu de .../{locale}/{nom}).
  // globalFileName remplace le nom par défaut (mea-{N}) quand renseigné.
  isGlobalImage: boolean;
  globalFileName: string;
  // Chemin CMS personnalisé : remplace tout ce qui précède le segment langue
  // (homepage/{année}/wk{semaine} par défaut). Toggle actif + champ vide =
  // on hérite du chemin défini au niveau de la section.
  useCustomPath: boolean;
  customPath: string;

  // Logo marque, au choix : un chemin CMS complet (pas de préfixe imposé,
  // contrairement à MeaItem.brandLogoPath) pour couvrir aussi bien la
  // bibliothèque "logo-puericulture/..." qu'un logo de campagne ailleurs — ou
  // une image uploadée, exportée avec les autres visuels de la section.
  showBrandLogo: boolean;
  brandLogoSource: "path" | "image";
  brandLogoPath: string;
  brandLogoUrl: string;
  brandLogoImageId: string;
  /** Attribut width du <img>, en pixels. La hauteur reste automatique. */
  brandLogoWidth: number;

  // Badge texte (hp-cat-header-mea__badge, ex: "Best Price")
  showBadge: boolean;
  badgeText: string;

  // Titre marketing secondaire, affiché au-dessus du titre principal
  showMarketingTitle: boolean;
  marketingTitle: string;

  // Prix — même système que MeaItem (v1)
  pricingMode: MeaPricingMode;
  showPrePrice: boolean;
  prePriceText: string;
  initialPrice: string;
  customPriceText: string;
  clubPrice: string;
  showClubLabel: boolean;
  clubLabelText: string;
  showClubIcon: boolean;
}

export interface MeaV2AppelPrix {
  enabled: boolean;
  title: string;
  initialPrice: string;
  clubPrice: string;
  showClubIcon: boolean;
}

export interface MeaV2FocusCard extends MeaV2Card {
  mediaType: "image" | "video";
  videoUrl: string;
  videoId: string;
  appelPrix: MeaV2AppelPrix;
}

export interface MeaV2Content {
  // Toujours 4 cartes : la grille CSS (nth-child(3n+1)) suppose ce nombre exact.
  cards: MeaV2Card[];
  focus: MeaV2FocusCard;
  // Chemin CMS personnalisé partagé par les cartes de la section — chaque
  // carte peut le surcharger. Absent des contenus créés avant.
  customPath?: string;
}

// --- Fil d'ariane (breadcrumb catégorie, pas d'image) ---

export interface ArianeLink {
  id: string;
  label: string;
  linkType: "cgid" | "url" | "cid";
  cgid: string;
  cid: string;
  link: string;
}

export interface ArianeContent {
  title: string;
  comment: string;
  links: ArianeLink[];
}

// --- Edito (cartes éditoriales à thème, carousel mobile / grille desktop) ---

export type EditoTheme = "blue" | "green" | "aqua" | "purple" | "pink" | "peach";

export const EDITO_THEMES: { value: EditoTheme; label: string }[] = [
  { value: "aqua", label: "Aqua" },
  { value: "blue", label: "Bleu" },
  { value: "peach", label: "Pêche" },
  { value: "pink", label: "Rose" },
  { value: "green", label: "Vert" },
  { value: "purple", label: "Violet" },
];

export interface EditoCard {
  id: string;
  comment: string;
  theme: EditoTheme;
  title: string;
  text: string;
  imageUrl: string;
  imageId: string;
  imageWeek: number | null;
  exportPosition: number | null;
  // Lien de l'image (edito-card__media), indépendant des boutons ci-dessous
  linkType: "cgid" | "url" | "cid";
  cgid: string;
  cid: string;
  link: string;
  buttons: MeaButton[];
  // Bibliothèque de blocs (même principe que le Global header) : libellé pour
  // retrouver le bloc, et bloc d'origine s'il en vient. Optionnels : absents
  // des cartes créées avant la bibliothèque.
  label?: string;
  sourceItemId?: string | null;
}

export interface EditoContent {
  items: EditoCard[];
}

/** Bloc Edito enregistré en bibliothèque (table edito_items). */
export interface EditoLibraryItem {
  id: string;
  locale: Locale;
  label: string;
  theme: EditoTheme;
  title: string;
  text: string;
  imageUrl: string;
  linkType: "cgid" | "url" | "cid";
  cgid: string;
  cid: string;
  link: string;
  buttons: MeaButton[];
}

// --- Img sous menu (liste d'images pleine largeur, un lien chacune) ---

export interface ImgSousMenuItem {
  id: string;
  // Informatif seulement : jamais exporté dans le HTML, juste pour s'y
  // retrouver dans l'éditeur/preview (équivalent d'un "comment" ailleurs).
  label: string;
  imageUrl: string;
  imageId: string;
  imageWeek: number | null;
  exportPosition: number | null;
  linkType: "cgid" | "url" | "cid";
  cgid: string;
  cid: string;
  link: string;
}

export interface ImgSousMenuContent {
  items: ImgSousMenuItem[];
}

// --- Cat banner (bannière catégorie desktop/mobile, un lien chacune) ---

export interface CatBannerItem {
  id: string;
  // Sert à la fois d'alt (tel quel) et de base du nom de fichier exporté
  // (slugifié : sans accents, espaces -> "-").
  label: string;
  url: string;
  desktopImageUrl: string;
  desktopImageId: string;
  mobileImageUrl: string;
  mobileImageId: string;
  imageWeek: number | null;
  exportPosition: number | null;
}

export interface CatBannerContent {
  items: CatBannerItem[];
}

// --- Miniature offre (liste d'images carrées 301x301, informatif) ---

export interface MiniatureOffreItem {
  id: string;
  label: string;
  imageUrl: string;
  imageId: string;
  imageWeek: number | null;
  exportPosition: number | null;
}

export interface MiniatureOffreContent {
  items: MiniatureOffreItem[];
}

// --- Carousel héro (Bootstrap, v2-html/carousel.html) — 2 diapositives fixes,
// pas de réordonnancement possible donc pas de exportPosition (comme MEA v2) ---

export interface CarouselButton {
  text: string;
  linkType: "cgid" | "url" | "cid";
  cgid: string;
  cid: string;
  link: string;
}

export interface CarouselProductCallout {
  enabled: boolean;
  // Réutilisé aussi comme alignement global de la diapositive (data-align
  // sur .carousel-caption) — "left"/"right" positionnent le callout produit
  // ET la diapositive du même côté ; "center"/"only-center" n'ont pas
  // d'équivalent .carousel-product dans le CSS scopé de la preview (approximation).
  side: "left" | "right" | "center" | "only-center";
  showBrandLogo: boolean;
  brandLogoPath: string; // segment après logo-puericulture/, ex: "svg/premaman.svg"
  // Mêmes réglages que le logo MEA v2 (cf. src/lib/brand-logo.ts). Optionnels :
  // le slider n'a pas de normalisation de contenu, les slides enregistrées
  // avant leur ajout ne les ont pas.
  brandLogoSource?: "path" | "image";
  brandLogoUrl?: string;
  brandLogoWidth?: number;
  label: string;
  publicPrice: string;
  clubPrice: string;
  showClubIcon: boolean;
  showPromoBadge: boolean;
  promoBadgeText: string;
}

export interface CarouselSlide {
  id: string;
  comment: string;

  // Fond : image ou vidéo (avec vignette)
  mediaType: "image" | "video";
  imageUrl: string;
  imageId: string;
  imageWeek: number | null;
  videoUrl: string;
  videoId: string;
  darkOverlay: boolean;

  // Titre : image stylisée (ex: logo "Soldes") ou texte simple
  titleType: "image" | "text";
  titleText: string;
  titleImageUrl: string;
  titleImageId: string;
  titleImageWeek: number | null;

  productCallout: CarouselProductCallout;

  buttons: CarouselButton[];

  // Lien fantôme : toute la diapositive cliquable, indépendant des boutons
  linkType: "cgid" | "url" | "cid";
  cgid: string;
  cid: string;
  link: string;
}

export interface CarouselContent {
  // Toujours 2 diapositives (indicateurs Bootstrap data-slide-to="0"/"1").
  slides: CarouselSlide[];
}

// --- Global header (bannière carousel Bootstrap, exemples/global-header-*.html)
// Items enregistrés dans une bibliothèque partagée (table global_header_items,
// recherchable par label) : la sélectionner copie son contenu dans la section
// (snapshot, comme les templates perso) — l'édition locale ne modifie la
// bibliothèque que via une sauvegarde explicite. Jusqu'à 3 items par section,
// l'ordre détermine la rotation (le 1er est "active"). Couleur au niveau de
// la section entière (pas par item).

export type GlobalHeaderLinkType = "cgid" | "cid" | "url" | "none";

export interface GlobalHeaderLibraryItem {
  id: string;
  // Un item n'a de sens que dans une langue : la bibliothèque est filtrée
  // par la locale du brief en cours d'édition (fichiers exemples/global-
  // header-{FR,BEFR,BENL,ES,GR}.html — un jeu de messages différent par
  // marché/langue).
  locale: Locale;
  label: string;
  text: string;
  linkType: GlobalHeaderLinkType;
  cgid: string;
  cid: string;
  link: string;
}

// Copie section-locale d'un item : pas de locale propre (celle du brief
// s'applique déjà), sourceItemId et comment sont propres à cette section.
export interface GlobalHeaderItem extends Omit<GlobalHeaderLibraryItem, "locale"> {
  // Item de bibliothèque dont ce contenu est issu (null = créé à la volée,
  // jamais sauvegardé) — permet le bouton "Enregistrer dans la bibliothèque".
  sourceItemId: string | null;
  // Note dev locale à cette section, jamais sauvegardée dans la bibliothèque.
  comment: string;
}

export interface GlobalHeaderContent {
  items: GlobalHeaderItem[];
  bgColor: string;
}

// --- Moodboard : tableau blanc à positionnement libre, purement informatif
// (aucun export CMS — ni HTML, ni images). Chaque élément porte sa propre
// position/taille en pixels dans le repère du canevas (canvasWidth ×
// canvasHeight), empilés par zIndex croissant.

export interface MoodboardTextElement {
  id: string;
  type: "text";
  zIndex: number;
  x: number;
  y: number;
  width: number;
  height: number;
  text: string;
  color: string;
  fontSize: number;
  bold: boolean;
  align: "left" | "center" | "right";
}

export interface MoodboardImageElement {
  id: string;
  type: "image";
  zIndex: number;
  x: number;
  y: number;
  width: number;
  height: number;
  imageUrl: string;
  imageId: string;
}

export interface MoodboardShapeElement {
  id: string;
  type: "shape";
  zIndex: number;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  // Rayon d'angle en pixels — 0 = rectangle net.
  radius: number;
}

// Trait/flèche : positionné par ses deux extrémités, pas par x/y/largeur/hauteur.
export interface MoodboardArrowElement {
  id: string;
  type: "arrow";
  zIndex: number;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color: string;
  strokeWidth: number;
}

export type MoodboardElement =
  | MoodboardTextElement
  | MoodboardImageElement
  | MoodboardShapeElement
  | MoodboardArrowElement;

export interface MoodboardContent {
  canvasWidth: number;
  canvasHeight: number;
  backgroundColor: string;
  elements: MoodboardElement[];
  // Note dev affichée en overlay en preview (jamais exportée — le template
  // entier ne l'est de toute façon pas), comme sur les autres templates.
  comment: string;
}
