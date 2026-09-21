// Où une image de la médiathèque est-elle encore utilisée ? Sert à prévenir
// avant de la supprimer. La suppression reste possible : les endroits qui
// l'utilisaient affichent alors une image manquante (cf. /api/assets/usage).

export interface AssetUsage {
  briefs: { id: string; label: string; sections: string[] }[];
  /** Templates personnalisés qui embarquent l'image. */
  templates: number;
  /** Blocs de la bibliothèque Edito qui l'utilisent. */
  editoBlocks: number;
}

const MAX_LISTED_BRIEFS = 8;

function plural(count: number, one: string, many: string): string {
  return `${count} ${count > 1 ? many : one}`;
}

/** Message de confirmation de suppression, adapté à l'utilisation de l'image. */
export function deleteConfirmationMessage(usage: AssetUsage): string {
  const lines = [
    ...usage.briefs
      .slice(0, MAX_LISTED_BRIEFS)
      .map((b) => `• ${b.label}${b.sections.length ? ` — ${b.sections.join(", ")}` : ""}`),
    ...(usage.briefs.length > MAX_LISTED_BRIEFS
      ? [`• … et ${plural(usage.briefs.length - MAX_LISTED_BRIEFS, "autre brief", "autres briefs")}`]
      : []),
    ...(usage.templates ? [`• ${plural(usage.templates, "template personnalisé", "templates personnalisés")}`] : []),
    ...(usage.editoBlocks
      ? [`• ${plural(usage.editoBlocks, "bloc de la bibliothèque Edito", "blocs de la bibliothèque Edito")}`]
      : []),
  ];

  if (lines.length === 0) return "Supprimer cette image ?";
  return [
    "Cette image est encore utilisée :",
    ...lines,
    "",
    "La supprimer quand même ? Elle apparaîtra comme image manquante à ces endroits.",
  ].join("\n");
}
