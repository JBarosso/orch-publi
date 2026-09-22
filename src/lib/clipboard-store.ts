import { useMemo, useSyncExternalStore } from "react";

// Presse-papiers applicatif : un seul emplacement par clé, rangé dans le
// navigateur (localStorage) pour survivre au passage d'un brief à l'autre et
// être vu par les autres onglets. Chaque copie remplace la précédente.
export function createClipboard<T>(key: string) {
  // L'événement « storage » ne prévient que les autres onglets : celui-ci
  // prévient l'onglet qui vient de copier.
  const changeEvent = `${key}:change`;

  const subscribe = (onChange: () => void) => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === key) onChange();
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener(changeEvent, onChange);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(changeEvent, onChange);
    };
  };

  // La chaîne brute sert d'instantané : stable tant qu'elle ne change pas.
  const readRaw = (): string | null => {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  };

  return {
    /** false si le navigateur refuse (navigation privée, quota dépassé). */
    write(value: T): boolean {
      try {
        localStorage.setItem(key, JSON.stringify(value));
        window.dispatchEvent(new Event(changeEvent));
        return true;
      } catch {
        return false;
      }
    },
    /** Dernière valeur copiée, ou null (toujours null au rendu serveur). */
    useValue(): T | null {
      const raw = useSyncExternalStore(subscribe, readRaw, () => null);
      return useMemo(() => {
        if (!raw) return null;
        try {
          return JSON.parse(raw) as T;
        } catch {
          return null;
        }
      }, [raw]);
    },
  };
}
