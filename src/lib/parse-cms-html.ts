// Utilitaires partagés pour importer du HTML déjà exporté vers le CMS (copié
// depuis le CMS quand il n'existe pas de brief à dupliquer) et reconstruire
// les items d'un template à partir du DOM. Basé sur DOMParser (natif
// navigateur) : ces fonctions ne tournent que côté client.

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
  year: number;
  week: number;
  // null = chemin "global" (pas de segment locale) — cf. isGlobalImage.
  locale: string | null;
  // Nom de fichier sans extension, ex: "quickaccess-4" ou "mon-nom-custom".
  baseName: string;
}

const CMS_IMAGE_PATH_WITH_LOCALE_RE = /homepage\/(\d{4})\/wk(\d{1,2})\/([a-z]{2,5})\/([a-z0-9-]+)\.(?:jpg|jpeg|png|webp|mp4)/i;
const CMS_IMAGE_PATH_GLOBAL_RE = /homepage\/(\d{4})\/wk(\d{1,2})\/([a-z0-9-]+)\.(?:jpg|jpeg|png|webp|mp4)/i;

// Ne récupère jamais l'image elle-même (elle vit déjà côté CMS, pas dans
// notre médiathèque) : juste de quoi figer semaine + position (et détecter le
// cas "image globale", cf. isGlobalImage) pour que le prochain export
// continue de pointer vers le fichier CMS existant. Essaie d'abord le format
// avec segment locale, puis le format global (une image globale n'a qu'un
// seul "/" entre wk{semaine} et le nom de fichier, donc ne matche jamais le
// premier motif — pas d'ambiguïté entre les deux).
export function parseCmsImagePath(src: string | null | undefined): ParsedCmsImagePath | null {
  const value = src ?? "";
  const withLocale = value.match(CMS_IMAGE_PATH_WITH_LOCALE_RE);
  if (withLocale) {
    return {
      year: Number(withLocale[1]),
      week: Number(withLocale[2]),
      locale: withLocale[3].toLowerCase(),
      baseName: withLocale[4],
    };
  }
  const global = value.match(CMS_IMAGE_PATH_GLOBAL_RE);
  if (!global) return null;
  return { year: Number(global[1]), week: Number(global[2]), locale: null, baseName: global[3] };
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
  if (!imagePath || imagePath.week === briefWeek) {
    return { imageWeek: null, exportPosition: null };
  }
  return { imageWeek: imagePath.week, exportPosition: trailingPosition(imagePath.baseName) ?? listPosition };
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
