export type BriefStatus = "draft" | "published" | "treated";

export type SectionType = "macarons" | "mea";

export type Locale = "fr" | "es" | "it" | "de" | "pt" | "en";

export const LOCALES: { value: Locale; label: string }[] = [
  { value: "fr", label: "Français" },
  { value: "es", label: "Español" },
  { value: "it", label: "Italiano" },
  { value: "de", label: "Deutsch" },
  { value: "pt", label: "Português" },
  { value: "en", label: "English" },
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
  order: number;
  content: unknown;
  visible: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Asset {
  id: string;
  url: string;
  label: string;
  mimeType: string;
  year: number | null;
  week: number | null;
  createdAt: Date;
}

export interface MacaronItem {
  id: string;
  label: string;
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
