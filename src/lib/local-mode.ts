"use client";

import { useSyncExternalStore } from "react";

// Mode local : les images sont traitées et gardées dans ce navigateur, sans
// jamais passer par le serveur — pour dépanner quand le stockage est
// indisponible, ou pour un brief de passage (ex: reçu en PowerPoint). Même
// pattern que dev-mode : un réglage par navigateur, synchro entre composants.
const STORAGE_KEY = "local-mode";
const listeners = new Set<() => void>();

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

/** Lecture hors composant (ex: au moment d'un upload). */
export function isLocalModeEnabled(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

export function useLocalMode() {
  return useSyncExternalStore(subscribe, isLocalModeEnabled, () => false);
}

export function setLocalMode(value: boolean) {
  localStorage.setItem(STORAGE_KEY, String(value));
  listeners.forEach((cb) => cb());
}
