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
  locale: string;
  position: number;
}

const CMS_IMAGE_PATH_RE = /homepage\/(\d{4})\/wk(\d{1,2})\/([a-z]{2,5})\/[a-z-]+?-(\d+)\.(?:jpg|jpeg|png|webp|mp4)/i;

// Ne récupère jamais l'image elle-même (elle vit déjà côté CMS, pas dans
// notre médiathèque) : juste de quoi figer semaine + position pour que le
// prochain export continue de pointer vers le fichier CMS existant.
export function parseCmsImagePath(src: string | null | undefined): ParsedCmsImagePath | null {
  const match = (src ?? "").match(CMS_IMAGE_PATH_RE);
  if (!match) return null;
  return {
    year: Number(match[1]),
    week: Number(match[2]),
    locale: match[3].toLowerCase(),
    position: Number(match[4]),
  };
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
 * liste importée.
 */
export function freezeImportedPosition(
  imagePath: ParsedCmsImagePath | null,
  briefWeek: number,
): { imageWeek: number | null; exportPosition: number | null } {
  if (!imagePath || imagePath.week === briefWeek) {
    return { imageWeek: null, exportPosition: null };
  }
  return { imageWeek: imagePath.week, exportPosition: imagePath.position };
}
