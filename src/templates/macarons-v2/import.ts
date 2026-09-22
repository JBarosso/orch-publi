import { v4 as uuidv4 } from "uuid";
import type { MacaronItem, QuickaccessPlacement } from "@/types";
import {
  freezeImportedPosition,
  isEmptyCmsLink,
  parseCmsImagePath,
  parseCmsLink,
  parseHtmlFragment,
  resolveGlobalImageFields,
  resolveImportedCustomPath,
  sharedCustomPath,
  textOf,
} from "@/lib/parse-cms-html";

export interface ImportQuickaccessV2Result {
  items: MacaronItem[];
  /** Chemin custom commun à toutes les tuiles, à poser sur la section. */
  customPath: string;
  /** Emplacement déduit des classes du HTML collé. */
  placement: QuickaccessPlacement;
  issueCount: number;
}

// Même composant CMS sur deux emplacements, classes scopées par page : la
// page d'accueil génère ".quickaccess-v2-item", les pages catégorie niveau 2
// (hp-cat-lvl2) le même HTML avec ".quickaccess-lvl2-item" — relevé sur le
// HTML réel des deux pages. L'emplacement détecté ici est conservé dans le
// contenu : c'est lui qui décide des classes réécrites à l'export, sans quoi
// une section importée d'une page catégorie ressortirait habillée en page
// d'accueil, donc sans style sur sa page d'origine.
const ITEM_CLASS_BY_PLACEMENT: Record<QuickaccessPlacement, string> = {
  homepage: "quickaccess-v2-item",
  cat_lvl2: "quickaccess-lvl2-item",
};

function selectorFor(suffix: string): string {
  return Object.values(ITEM_CLASS_BY_PLACEMENT)
    .map((c) => `.${c}${suffix}`)
    .join(", ");
}

function detectPlacement(doc: Document): QuickaccessPlacement {
  return doc.querySelector(`.${ITEM_CLASS_BY_PLACEMENT.cat_lvl2}`) ? "cat_lvl2" : "homepage";
}

/**
 * Reconstruit les tuiles quickaccess à partir du HTML déjà exporté vers
 * le CMS (cas: pas de brief à dupliquer, le code vient d'être récupéré
 * directement dans le CMS — page d'accueil ou catégorie niveau 2, cf.
 * QUICKACCESS_ITEM_CLASSES). Un champ non reconnu ne bloque pas l'import : il
 * est laissé vide et signalé dans le commentaire de la tuile.
 */
export function parseQuickaccessV2HTML(html: string, briefWeek: number): ImportQuickaccessV2Result {
  const doc = parseHtmlFragment(html);
  const nodes = Array.from(doc.querySelectorAll(selectorFor("")));
  if (nodes.length === 0) {
    throw new Error("Aucune tuile quickaccess reconnue dans le code collé.");
  }

  let issueCount = 0;

  const items: MacaronItem[] = nodes.map((node, index) => {
    const labelEl = node.querySelector(selectorFor("__label"));
    // Un <br> du libellé redevient le saut de ligne saisi dans l'éditeur.
    labelEl?.querySelectorAll("br").forEach((br) => br.replaceWith("\n"));
    const label = textOf(labelEl);
    const link = parseCmsLink(node.getAttribute("href"));
    const imagePath = parseCmsImagePath(node.querySelector("img")?.getAttribute("src"));
    const listPosition = index + 1;
    const { imageWeek, exportPosition } = freezeImportedPosition(imagePath, briefWeek, listPosition);
    const { isGlobalImage, globalFileName } = resolveGlobalImageFields(
      imagePath,
      `quickaccess-${exportPosition ?? listPosition}`,
    );
    const { useCustomPath, customPath } = resolveImportedCustomPath(imagePath);

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
      useCustomPath,
      customPath,
    };
  });

  // Chemin identique partout -> il vit au niveau de la section, les tuiles en héritent.
  const customPath = sharedCustomPath(items);
  if (customPath) {
    items.forEach((item) => {
      if (item.useCustomPath) item.customPath = "";
    });
  }

  return { items, customPath, placement: detectPlacement(doc), issueCount };
}
