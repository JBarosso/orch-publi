// Construction du chemin d'image CMS, partagée par les templates supportant
// le toggle "image globale" (quickaccess v2, MEA v2) : une image globale est
// partagée entre langues, donc son chemin omet le segment locale. Dans les
// deux cas le nom de fichier par défaut (ex: quickaccess-4, mea-2) peut être
// remplacé par un nom personnalisé.

export interface GlobalImageFields {
  isGlobalImage: boolean;
  globalFileName: string;
}

export function resolveImageBaseName(fields: GlobalImageFields, defaultName: string): string {
  const fileName = (fields.globalFileName ?? "").trim();
  return fields.isGlobalImage && fileName ? fileName : defaultName;
}

export function buildCmsImagePath(
  fields: GlobalImageFields,
  ctx: { year: number; week: number; locale: string },
  imageWeek: number | null,
  defaultName: string,
): string {
  const wk = String(imageWeek ?? ctx.week).padStart(2, "0");
  const baseName = resolveImageBaseName(fields, defaultName);
  return fields.isGlobalImage
    ? `homepage/${ctx.year}/wk${wk}/${baseName}`
    : `homepage/${ctx.year}/wk${wk}/${ctx.locale}/${baseName}`;
}
