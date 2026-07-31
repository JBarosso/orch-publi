"use client";

import { useEffect, useState } from "react";

// Retarde la propagation d'une valeur qui change à chaque frappe (ex: le
// contenu d'une section édité en direct). Utilisé pour les preview iframe :
// srcDoc en dépend directement, donc chaque frappe recréait tout le document
// (et donc chaque <img> qu'il contient) — les requêtes d'image, annulées en
// plein vol par la frappe suivante, finissaient par s'afficher comme cassées
// alors que le fichier existe bien (constaté sur le template slider).
export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}
