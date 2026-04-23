export type BriefStatus = "draft" | "published" | "treated";

export type SectionType = "macarons" | "mea";
export type AssetType = "macaron" | "mea" | "other";

export type Locale = "FR" | "BEFR" | "BENL" | "GR" | "ES";

export const LOCALES: { value: Locale; label: string }[] = [
  { value: "FR", label: "FR" },
  { value: "BEFR", label: "BEFR" },
  { value: "BENL", label: "BENL" },
  { value: "GR", label: "GR" },
  { value: "ES", label: "ES" },
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
  createdAt: Date;
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
  visible: boolean;
}

export interface MacaronsContent {
  items: MacaronItem[];
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
