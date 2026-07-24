"use client";

import { useSyncExternalStore } from "react";

// Toggle "mode dev" (aside) : active la sélection multiple de briefs sur le
// dashboard pour l'export groupé. Même pattern que sidebar-collapsed
// (localStorage + useSyncExternalStore) pour rester synchro entre les
// composants sans passer par un contexte React.
const STORAGE_KEY = "dev-mode";
const listeners = new Set<() => void>();

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}
function getSnapshot() {
  return localStorage.getItem(STORAGE_KEY) === "true";
}

export function useDevMode() {
  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}

export function setDevMode(value: boolean) {
  localStorage.setItem(STORAGE_KEY, String(value));
  listeners.forEach((cb) => cb());
}
