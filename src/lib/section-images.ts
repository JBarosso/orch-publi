// Contrat partagé par tous les templates pour décrire un fichier à exporter
// dans le ZIP. La collecte elle-même vit dans chaque template
// (`src/templates/<nom>/images.ts`) et est branchée dans le registre
// (`src/templates/registry.ts`) — c'est là qu'il faut regarder pour ajouter
// un type de section.

export interface ImageEntry {
  imageUrl: string;
  imageWeek: number | null;
  baseName: string;
  // null = dimensions libres (sections personnalisées) : pas de resize forcé
  width: number | null;
  height: number | null;
  // Vidéo (carte focus MEA v2, slide carousel) : copiée telle quelle dans le zip, pas de sharp
  isVideo?: boolean;
  // Racine du chemin CMS — "homepage" par défaut si absent (cf. build-zip.ts)
  folder?: string;
  // N'exporte que le .jpg, pas de variante .webp (cat-banner : pas de <picture>)
  jpgOnly?: boolean;
  // Image "globale" (quickaccess v2, MEA v2) : omet le segment locale dans le
  // chemin CMS du zip (doit matcher buildCmsImagePath côté export HTML).
  noLocale?: boolean;
  // Chemin personnalisé (quickaccess v2, MEA v2) remplaçant
  // "{folder}/{année}/wk{semaine}" — doit matcher resolveCmsFolder côté
  // export HTML. Absent = chemin par défaut.
  customFolder?: string;
}

/**
 * Fige la position AVANT de retirer les items sans image, pour qu'elle
 * corresponde à l'ordre réel dans le template (celui utilisé par le HTML
 * généré), pas à l'ordre parmi les seuls items déjà renseignés — sinon le
 * nom de fichier exporté ne correspond plus à la position affichée dès qu'un
 * item sans image précède un item rempli.
 *
 * Filtrer les items visibles AVANT l'appel, filtrer les images APRÈS.
 */
export function withPosition<T>(items: T[]): { item: T; position: number }[] {
  return items.map((item, index) => ({ item, position: index + 1 }));
}
