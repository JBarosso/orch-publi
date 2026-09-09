// Le contenu des sections est du JSON non validé : une ligne enregistrée
// avant l'ajout d'un champ ne le porte tout simplement pas. Sans complétion,
// ces champs manquants remontent en `undefined` jusqu'aux composants
// contrôlés (Switch, Input) et provoquent l'avertissement React
// "uncontrolled to controlled" — déjà rencontré deux fois.
//
// La règle est toujours la même : partir des valeurs par défaut du template
// (les factories `createEmpty*`) et écraser avec ce qui est réellement
// stocké. Les clés absentes du JSON gardent donc le défaut, celles présentes
// gagnent.

/** Complète un objet avec les défauts du template. */
export function withDefaults<T extends object>(defaults: T, stored: Partial<T> | null | undefined): T {
  return { ...defaults, ...(stored ?? {}) };
}

/**
 * Complète chaque élément d'une liste. `makeDefaults` reçoit l'id existant
 * (ou en génère un) pour que les factories qui en attendent un fonctionnent.
 */
export function withItemDefaults<T extends { id: string }>(
  stored: unknown,
  makeDefaults: (id: string) => T,
  normalizeItem?: (item: T) => T,
): T[] {
  if (!Array.isArray(stored)) return [];
  return stored.map((raw) => {
    const item = (raw ?? {}) as Partial<T> & { id?: string };
    const complete = withDefaults(makeDefaults(item.id ?? crypto.randomUUID()), item as Partial<T>);
    return normalizeItem ? normalizeItem(complete) : complete;
  });
}
