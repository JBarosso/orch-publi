import { v4 as uuidv4 } from "uuid";
import type { MacaronItem } from "@/types";
import {
  freezeImportedPosition,
  isEmptyCmsLink,
  parseCmsImagePath,
  parseCmsLink,
  parseHtmlFragment,
  resolveGlobalImageFields,
  textOf,
} from "@/lib/parse-cms-html";

export interface ImportQuickaccessV2Result {
  items: MacaronItem[];
  issueCount: number;
}

/**
 * Reconstruit les tuiles quickaccess v2 à partir du HTML déjà exporté vers
 * le CMS (cas: pas de brief à dupliquer, le code vient d'être récupéré
 * directement dans le CMS). Un champ non reconnu ne bloque pas l'import : il
 * est laissé vide et signalé dans le commentaire de la tuile.
 */
export function parseQuickaccessV2HTML(html: string, briefWeek: number): ImportQuickaccessV2Result {
  const doc = parseHtmlFragment(html);
  const nodes = Array.from(doc.querySelectorAll(".quickaccess-v2-item"));
  if (nodes.length === 0) {
    throw new Error("Aucune tuile quickaccess v2 reconnue dans le code collé.");
  }

  let issueCount = 0;

  const items: MacaronItem[] = nodes.map((node, index) => {
    const label = textOf(node.querySelector(".quickaccess-v2-item__label"));
    const link = parseCmsLink(node.getAttribute("href"));
    const imagePath = parseCmsImagePath(node.querySelector("img")?.getAttribute("src"));
    const listPosition = index + 1;
    const { imageWeek, exportPosition } = freezeImportedPosition(imagePath, briefWeek, listPosition);
    const { isGlobalImage, globalFileName } = resolveGlobalImageFields(
      imagePath,
      `quickaccess-${exportPosition ?? listPosition}`,
    );

    const issues: string[] = [];
    if (!label) issues.push("libellé introuvable");
    if (isEmptyCmsLink(link)) issues.push("lien introuvable");
    if (!imagePath) issues.push("chemin d'image non reconnu — image à resélectionner");
    if (issues.length > 0) issueCount += 1;

    return {
      id: uuidv4(),
      label,
      comment: issues.length > 0 ? `Import CMS : ${issues.join(", ")}.` : "",
      linkType: link.linkType,
      cgid: link.cgid,
      cid: link.cid,
      link: link.link,
      imageUrl: "",
      imageId: uuidv4().slice(0, 8),
      imageWeek,
      exportPosition,
      visible: true,
      isGlobalImage,
      globalFileName,
    };
  });

  return { items, issueCount };
}
