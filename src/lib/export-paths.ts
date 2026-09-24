import type { ImageEntry } from "@/lib/section-images";
import { cmsLocalePath } from "@/lib/utils";

// Arborescence du ZIP d'export, partagée par le ZIP fabriqué sur le serveur
// (build-zip.ts) et celui du mode local, fabriqué dans le navigateur
// (client-zip.ts) : un seul calcul, pour que les deux ne divergent jamais.

export interface ZipPathContext {
  // "" pour l'export simple — un chemin type "macaron/Rentrée scolaire" pour
  // l'export groupé multi-briefs.
  folderPrefix: string;
  year: number;
  week: number;
  locale: string;
}

/** Chemin CMS du fichier, sans le nom : doit matcher buildCmsImagePath côté export HTML. */
export function zipFolderFor(img: ImageEntry, group: ZipPathContext): string {
  const prefix = group.folderPrefix ? `${group.folderPrefix}/` : "";

  // Chemin personnalisé : il remplace tout, langue comprise — seul le nom du
  // fichier lui est ajouté.
  if (img.customFolder) return `${prefix}${img.customFolder}`;

  const imgWk = String(img.imageWeek ?? group.week).padStart(2, "0");
  // Locale en minuscule, "be" pour BEFR/BENL (doit matcher le <img src>
  // exporté). Racine "homepage" par défaut, surchargeable par template
  // (ex: "banner" pour cat-banner) via img.folder.
  const folder = img.folder ?? "homepage";
  const localeSegment = img.noLocale ? "" : `/${cmsLocalePath(group.locale)}`;
  // Plusieurs sections du même type dans le brief : la 2e et les suivantes ont
  // leur propre dossier, sinon leurs fichiers homonymes s'écrasent.
  const sectionSegment = img.sectionFolder ? `/${img.sectionFolder}` : "";
  return `${prefix}${folder}/${group.year}/wk${imgWk}${localeSegment}${sectionSegment}`;
}

export const MISSING_IMAGES_FILE = "_IMAGES-MANQUANTES.txt";

/**
 * Rapport glissé dans l'archive quand des images manquent : c'est le seul
 * endroit que l'utilisateur ouvrira forcément s'il lui manque des visuels.
 */
export function missingImagesReport(failed: string[]): string {
  return [
    "Images absentes de cet export (asset illisible au moment de la génération) :",
    "",
    ...failed.map((f) => `  - ${f}`),
    "",
    "Vérifiez ces visuels dans la médiathèque, puis relancez l'export.",
  ].join("\n");
}
