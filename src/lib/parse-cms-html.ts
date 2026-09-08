// Utilitaires partagés pour importer du HTML déjà exporté vers le CMS (copié
// depuis le CMS quand il n'existe pas de brief à dupliquer) et reconstruire
// les items d'un template à partir du DOM. Basé sur DOMParser (natif
// navigateur) : ces fonctions ne tournent que côté client.

import { LOCALES } from "@/types";
import { cmsLocalePath } from "@/lib/utils";

export interface ParsedCmsLink {
  linkType: "cgid" | "cid" | "url";
  cgid: string;
  cid: string;
  link: string;
}

// Reconnaît les deux formats générés par l'app ($url(...)$ pour cgid,
// $url ou $httpsUrl('Page-Show','cid',...)$ pour cid — le CMS accepte les
// deux, les générateurs v1/v2 ne s'accordent pas toujours sur lequel utiliser).
export function parseCmsLink(href: string | null | undefined): ParsedCmsLink {
  const trimmed = (href ?? "").trim();
  const cgidMatch = trimmed.match(/\$url\('Search-Show','cgid','([^']*)'\)\$/);
  if (cgidMatch) return { linkType: "cgid", cgid: cgidMatch[1], cid: "", link: "" };
  const cidMatch = trimmed.match(/\$(?:url|httpsUrl)\('(?:Search-Show|Page-Show)','cid','([^']*)'\)\$/);
  if (cidMatch) return { linkType: "cid", cgid: "", cid: cidMatch[1], link: "" };
  return { linkType: "url", cgid: "", cid: "", link: trimmed === "#" || trimmed === "" ? "" : trimmed };
}

export interface ParsedCmsImagePath {
  // null quand le chemin est personnalisé : il ne porte alors ni année ni
  // semaine (cf. customPath).
  year: number | null;
  week: number | null;
  // null = chemin "global" (pas de segment locale) — cf. isGlobalImage.
  locale: string | null;
  // Nom de fichier sans extension, ex: "quickaccess-4" ou "mon-nom-custom".
  baseName: string;
  // Dossier personnalisé (tout ce qui précède le segment langue), vide quand
  // le chemin suit le défaut homepage/{année}/wk{semaine}.
  customPath: string;
}

const CMS_IMAGE_FILE_RE = /^(.*)\/([A-Za-z0-9_-]+)\.(?:jpg|jpeg|png|webp|mp4)$/i;
const CMS_DEFAULT_FOLDER_RE = /(?:^|\/)homepage\/(\d{4})\/wk(\d{1,2})$/i;

// Segments de langue possibles dans un chemin CMS (cf. cmsLocalePath : BEFR
// et BENL partagent le dossier "be").
const CMS_LOCALE_SEGMENTS = new Set(LOCALES.map((l) => cmsLocalePath(l.value)));

// Ne récupère jamais l'image elle-même (elle vit déjà côté CMS, pas dans
// notre médiathèque) : juste de quoi figer semaine + position et détecter les
// cas "image globale" / "chemin personnalisé", pour que le prochain export
// continue de pointer vers le fichier CMS existant.
//
// Le segment langue est reconnu par sa valeur (fr, be, es, gr) et non par sa
// position : c'est le seul moyen de distinguer ".../campagne/fr/img.jpg" (avec
// langue) de ".../campagne/img.jpg" (image globale) quand le préfixe est
// libre. Un dossier personnalisé qui s'appellerait exactement comme une locale
// serait donc pris pour la langue — cas jugé improbable.
export function parseCmsImagePath(src: string | null | undefined): ParsedCmsImagePath | null {
  // Retire "?$staticlink$" et consorts
  const value = (src ?? "").trim().split("?")[0];
  const match = value.match(CMS_IMAGE_FILE_RE);
  if (!match) return null;

  const segments = match[1].split("/").filter(Boolean);
  const baseName = match[2];
  if (segments.length === 0) return null;

  const last = segments[segments.length - 1].toLowerCase();
  const hasLocale = CMS_LOCALE_SEGMENTS.has(last);
  const folder = (hasLocale ? segments.slice(0, -1) : segments).join("/");
  const locale = hasLocale ? last : null;

  const defaultFolder = folder.match(CMS_DEFAULT_FOLDER_RE);
  if (defaultFolder) {
    return {
      year: Number(defaultFolder[1]),
      week: Number(defaultFolder[2]),
      locale,
      baseName,
      customPath: "",
    };
  }
  return { year: null, week: null, locale, baseName, customPath: folder };
}

// Position par défaut (ex: "quickaccess-4" -> 4) quand le nom suit le
// nommage automatique. Absente pour un nom entièrement personnalisé.
function trailingPosition(baseName: string): number | null {
  const match = baseName.match(/-(\d+)$/);
  return match ? Number(match[1]) : null;
}

export function isEmptyCmsLink(link: ParsedCmsLink): boolean {
  if (link.linkType === "cgid") return !link.cgid.trim();
  if (link.linkType === "cid") return !link.cid.trim();
  return !link.link.trim();
}

export function textOf(el: Element | null | undefined): string {
  return (el?.textContent ?? "").trim();
}

export function hasClass(el: Element | null | undefined, cls: string): boolean {
  return !!el?.classList.contains(cls);
}

export function parseHtmlFragment(html: string): Document {
  return new DOMParser().parseFromString(html, "text/html");
}

/**
 * Semaine/position figées uniquement quand l'image importée vient d'une
 * semaine différente de celle du brief courant — même règle que partout
 * ailleurs dans l'app (cf. freeze-content-week.ts, WeekField) : native de la
 * semaine du brief = pas de figeage, la position suit l'ordre naturel de la
 * liste importée. listPosition sert de repli quand le nom de fichier ne suit
 * pas le nommage automatique (nom personnalisé, cf. resolveGlobalImageFields).
 */
export function freezeImportedPosition(
  imagePath: ParsedCmsImagePath | null,
  briefWeek: number,
  listPosition: number,
): { imageWeek: number | null; exportPosition: number | null } {
  // week === null : chemin personnalisé, la semaine n'y figure pas — rien à
  // figer, l'item suit la semaine du brief.
  if (!imagePath || imagePath.week === null || imagePath.week === briefWeek) {
    return { imageWeek: null, exportPosition: null };
  }
  return { imageWeek: imagePath.week, exportPosition: trailingPosition(imagePath.baseName) ?? listPosition };
}

/** Chemin personnalisé détecté dans le HTML importé, prêt à poser sur l'item. */
export function resolveImportedCustomPath(
  imagePath: ParsedCmsImagePath | null,
): { useCustomPath: boolean; customPath: string } {
  const customPath = imagePath?.customPath ?? "";
  return customPath ? { useCustomPath: true, customPath } : { useCustomPath: false, customPath: "" };
}

/**
 * Chemin personnalisé commun à toutes les images importées, à remonter au
 * niveau de la section (les items le laissent alors vide et en héritent) —
 * on obtient l'état qu'un humain aurait saisi, modifiable en un seul endroit.
 * Vide si les chemins diffèrent : chaque item garde alors le sien.
 */
export function sharedCustomPath(
  items: { useCustomPath: boolean; customPath: string }[],
): string {
  const used = items.filter((i) => i.useCustomPath && i.customPath);
  if (used.length === 0) return "";
  const first = used[0].customPath;
  return used.every((i) => i.customPath === first) ? first : "";
}

/**
 * Détecte une image "globale" (chemin CMS sans segment locale, cf. le toggle
 * "Global" des templates v2) et le nom de fichier personnalisé le cas
 * échéant. defaultName est le nom qu'aurait généré l'app pour cette position
 * (ex: "quickaccess-4") — s'il correspond exactement, le nom suit juste le
 * nommage automatique et globalFileName reste vide (pas de gel inutile).
 */
export function resolveGlobalImageFields(
  imagePath: ParsedCmsImagePath | null,
  defaultName: string,
): { isGlobalImage: boolean; globalFileName: string } {
  if (!imagePath || imagePath.locale !== null) {
    return { isGlobalImage: false, globalFileName: "" };
  }
  return {
    isGlobalImage: true,
    globalFileName: imagePath.baseName !== defaultName ? imagePath.baseName : "",
  };
}
