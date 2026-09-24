import { getSectionImages } from "@/templates/registry";
import { sectionExportFolders } from "@/lib/section-export-folder";
import type { ImageEntry } from "@/lib/section-images";

export interface ExportableSection {
  id: string;
  type: string;
  title: string;
  content: unknown;
  visible?: boolean | null;
  order?: number | null;
}

/**
 * Fichiers du ZIP d'un brief — calcul partagé par l'export du serveur et
 * celui du mode local, pour qu'ils listent exactement les mêmes images.
 *
 * Les sous-dossiers des sections en double sont calculés sur toutes les
 * sections, dans l'ordre d'affichage, y compris celles qui ne sont pas
 * exportées : masquer une section ne doit pas déplacer les fichiers des
 * autres. `onlySectionId` limite à une section, exportée même si son toggle
 * « Export » est coupé (c'est une demande explicite).
 */
export function collectBriefImages(sections: ExportableSection[], onlySectionId?: string): ImageEntry[] {
  const ordered = [...sections].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const folders = sectionExportFolders(ordered);
  return ordered
    .filter((s) => (onlySectionId ? s.id === onlySectionId : s.visible !== false))
    .flatMap((s) => getSectionImages(s.type, s.content, folders.get(s.id)));
}
