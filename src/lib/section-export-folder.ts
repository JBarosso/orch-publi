// Deux sections du même type dans un brief produisent les mêmes noms de
// fichiers (quickaccess-3.jpg, mea-2.jpg...) : elles s'écrasent l'une l'autre
// dans le ZIP comme dans le CMS, puisque le HTML exporté pointe au même
// endroit. Les sections suivantes reçoivent donc un sous-dossier tiré de leur
// titre. La première garde le chemin historique : les briefs déjà exportés ne
// changent pas de chemin.

export interface SectionFolderInput {
  id: string;
  type: string;
  title: string;
}

const MAX_SLUG_LENGTH = 40;

/** Titre de section en segment de chemin CMS ; vide si le titre n'en laisse rien. */
export function slugifySectionTitle(title: string | null | undefined): string {
  return (title ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .slice(0, MAX_SLUG_LENGTH)
    .replace(/^-+|-+$/g, "");
}

/**
 * Sous-dossier de chaque section, indexé par id : vide pour la première de
 * chaque type. `sections` doit arriver dans l'ordre d'affichage du brief —
 * c'est lui qui décide laquelle garde le chemin historique.
 */
export function sectionExportFolders(sections: SectionFolderInput[]): Map<string, string> {
  const seenByType = new Map<string, number>();
  const taken = new Set<string>();
  const folders = new Map<string, string>();

  for (const section of sections) {
    const rank = (seenByType.get(section.type) ?? 0) + 1;
    seenByType.set(section.type, rank);

    if (rank === 1) {
      folders.set(section.id, "");
      continue;
    }

    const base = slugifySectionTitle(section.title) || `section-${rank}`;
    // Deux sections homonymes retomberaient sinon dans le même dossier, ce qui
    // ramènerait le problème qu'on corrige.
    const folder = taken.has(base) ? `${base}-${rank}` : base;
    taken.add(folder);
    folders.set(section.id, folder);
  }

  return folders;
}
