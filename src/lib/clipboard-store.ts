import { useMemo, useSyncExternalStore } from "react";

/** Âge d'une copie, en clair (« à l'instant », « il y a 5 minutes », « hier »…). */
export function formatCopyAge(copiedAt: string | undefined, now = Date.now()): string {
  const minutes = copiedAt ? Math.floor((now - Date.parse(copiedAt)) / 60000) : NaN;
  if (!Number.isFinite(minutes)) return "";
  if (minutes < 1) return "à l'instant";
  const rtf = new Intl.RelativeTimeFormat("fr", { numeric: "auto" });
  if (minutes < 60) return rtf.format(-minutes, "minute");
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return rtf.format(-hours, "hour");
  return rtf.format(-Math.floor(hours / 24), "day");
}

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
    clear(): void {
      try {
        localStorage.removeItem(key);
        window.dispatchEvent(new Event(changeEvent));
      } catch {
        // stockage indisponible : il n'y avait rien à vider
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
