// Libellé humain d'un type de section — titre par défaut à la création
// (sections/route.ts) et nom de dossier dans l'export ZIP groupé
// (export/images/group/route.ts).
export function normalizeTypeLabel(type: string): string {
  if (type === "macarons") return "macaron";
  if (type === "custom") return "section perso";
  if (type === "macarons_v2") return "macaron v2";
  if (type === "mea_v2") return "MEA v2";
  if (type === "ariane") return "fil d'ariane";
  if (type === "edito") return "edito";
  if (type === "carousel") return "slider";
  if (type === "global_header") return "global header";
  if (type === "img_sous_menu") return "img sous menu";
  if (type === "cat_banner") return "cat banner";
  if (type === "miniature_offre") return "miniature offre";
  return type;
}
