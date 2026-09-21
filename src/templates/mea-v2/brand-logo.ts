import type { MeaV2Card } from "@/types";
import { buildCmsImagePath, resolveImageBaseName } from "@/lib/cms-image-path";

// Nommage du logo marque uploadé d'une carte MEA v2, partagé par l'export HTML
// (export.ts) et la collecte du ZIP (images.ts). Les deux doivent produire
// exactement le même chemin, sinon le CMS pointe vers un fichier absent de
// l'archive — d'où ce module commun plutôt qu'un suffixe recopié de chaque côté.
// Le reste (source, extension, largeur) est commun à tous les logos : cf.
// src/lib/brand-logo.ts.

export const DEFAULT_BRAND_LOGO_PATH = "logo-puericulture/svg/premaman-blc.svg";

/**
 * Le logo partage le dossier CMS de la carte mais jamais son nom de fichier :
 * sur une carte en image "globale", `globalFileName` s'appliquerait aussi au
 * logo et les deux visuels s'écraseraient l'un l'autre.
 */
function logoFields(card: MeaV2Card) {
  return { ...card, globalFileName: card.globalFileName ? `${card.globalFileName}-logo` : "" };
}

export function brandLogoBaseName(card: MeaV2Card, cardDefaultName: string): string {
  return resolveImageBaseName(logoFields(card), `${cardDefaultName}-logo`);
}

export function brandLogoCmsPath(
  card: MeaV2Card,
  ctx: { year: number; week: number; locale: string },
  cardDefaultName: string,
  sectionCustomPath?: string | null,
): string {
  return buildCmsImagePath(
    logoFields(card),
    ctx,
    card.imageWeek,
    `${cardDefaultName}-logo`,
    sectionCustomPath,
  );
}
