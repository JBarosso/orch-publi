// Construction du chemin d'image CMS, partagée par les templates v2
// (quickaccess v2, MEA v2). Le chemin se lit en trois morceaux :
//
//   {dossier}/{langue}/{nom de fichier}.jpg
//
// - dossier : "homepage/{année}/wk{semaine}" par défaut, remplaçable par un
//   chemin personnalisé (ex: "landing-pages/fille/campagne") défini au niveau
//   de la section et surchargeable item par item ;
// - langue : omise pour une image "globale" (partagée entre langues) ;
// - nom de fichier : nommage automatique (quickaccess-4, mea-2) ou nom
//   personnalisé quand l'image est globale.

export interface ImagePathFields {
  isGlobalImage: boolean;
  globalFileName: string;
  useCustomPath: boolean;
  customPath: string;
}

/** Chemin saisi à la main : espaces et "/" de début/fin retirés. */
export function normalizeCustomPath(path: string | null | undefined): string {
  return (path ?? "").trim().replace(/^\/+|\/+$/g, "");
}

/**
 * Chemin personnalisé effectif d'un item : le sien s'il en a un, sinon celui
 * de la section. Vide si l'item n'utilise pas de chemin personnalisé (ou si
 * le toggle est actif mais qu'aucun chemin n'est renseigné nulle part — on
 * retombe alors sur le chemin par défaut plutôt que d'exporter un chemin
 * tronqué).
 */
export function resolveCustomFolder(
  fields: ImagePathFields,
  sectionCustomPath: string | null | undefined,
): string {
  if (!fields.useCustomPath) return "";
  return normalizeCustomPath(fields.customPath) || normalizeCustomPath(sectionCustomPath);
}

/** Dossier CMS complet, avant le segment langue. */
export function resolveCmsFolder(
  fields: ImagePathFields,
  sectionCustomPath: string | null | undefined,
  ctx: { year: number; week: number },
  imageWeek: number | null,
): string {
  const custom = resolveCustomFolder(fields, sectionCustomPath);
  if (custom) return custom;
  const wk = String(imageWeek ?? ctx.week).padStart(2, "0");
  return `homepage/${ctx.year}/wk${wk}`;
}

export function resolveImageBaseName(fields: ImagePathFields, defaultName: string): string {
  const fileName = (fields.globalFileName ?? "").trim();
  return fields.isGlobalImage && fileName ? fileName : defaultName;
}

export function buildCmsImagePath(
  fields: ImagePathFields,
  ctx: { year: number; week: number; locale: string },
  imageWeek: number | null,
  defaultName: string,
  sectionCustomPath?: string | null,
): string {
  const folder = resolveCmsFolder(fields, sectionCustomPath, ctx, imageWeek);
  const baseName = resolveImageBaseName(fields, defaultName);
  return fields.isGlobalImage ? `${folder}/${baseName}` : `${folder}/${ctx.locale}/${baseName}`;
}
