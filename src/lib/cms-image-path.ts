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

/**
 * Ce que l'export d'une section a besoin de savoir du brief. Défini ici, au
 * plus près des chemins CMS, et partagé par tous les templates : le ZIP et le
 * HTML doivent construire exactement le même chemin.
 */
export interface ExportContext {
  year: number;
  week: number;
  locale: string;
  /** Sous-dossier quand le brief compte plusieurs sections du même type. */
  sectionFolder?: string;
}

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
 * Chemin personnalisé effectif d'un item : le sien s'il en a activé un, sinon
 * celui de la section, qui s'applique à tous ses items sans réglage par item.
 * Vide quand ni l'un ni l'autre n'est renseigné : on retombe alors sur le
 * chemin par défaut plutôt que d'exporter un chemin tronqué.
 */
export function resolveCustomFolder(
  fields: ImagePathFields,
  sectionCustomPath: string | null | undefined,
): string {
  const own = fields.useCustomPath ? normalizeCustomPath(fields.customPath) : "";
  return own || normalizeCustomPath(sectionCustomPath);
}

/** Dossier par défaut, quand aucun chemin personnalisé n'est renseigné. */
export function defaultCmsFolder(ctx: { year: number; week: number }, imageWeek: number | null): string {
  const wk = String(imageWeek ?? ctx.week).padStart(2, "0");
  return `homepage/${ctx.year}/wk${wk}`;
}

export function resolveImageBaseName(fields: ImagePathFields, defaultName: string): string {
  const fileName = (fields.globalFileName ?? "").trim();
  return fields.isGlobalImage && fileName ? fileName : defaultName;
}

/**
 * Dernier segment du dossier quand le brief compte plusieurs sections du même
 * type (cf. sectionExportFolders) : sans lui, leurs fichiers portent les mêmes
 * noms et s'écrasent. Doit matcher subFolderFor côté ZIP.
 */
export function sectionFolderSegment(ctx: { sectionFolder?: string }): string {
  return ctx.sectionFolder ? `/${ctx.sectionFolder}` : "";
}

export function buildCmsImagePath(
  fields: ImagePathFields,
  ctx: { year: number; week: number; locale: string; sectionFolder?: string },
  imageWeek: number | null,
  defaultName: string,
  sectionCustomPath?: string | null,
): string {
  const baseName = resolveImageBaseName(fields, defaultName);
  // Chemin personnalisé : il remplace tout, langue comprise. Il désigne déjà un
  // emplacement précis du CMS — seul le nom du fichier lui est ajouté, et le
  // sous-dossier automatique des sections en double n'a plus lieu d'être.
  const custom = resolveCustomFolder(fields, sectionCustomPath);
  if (custom) return `${custom}/${baseName}`;

  const folder = defaultCmsFolder(ctx, imageWeek);
  const dir = fields.isGlobalImage ? folder : `${folder}/${ctx.locale}`;
  return `${dir}${sectionFolderSegment(ctx)}/${baseName}`;
}
