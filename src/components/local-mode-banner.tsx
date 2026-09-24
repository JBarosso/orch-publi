"use client";

import { useEffect } from "react";
import { HardDrive } from "lucide-react";
import { useLocalMode } from "@/lib/local-mode";

/**
 * Enregistre le service worker qui sert les images locales — toujours, pas
 * seulement en mode local : les images faites ici doivent rester visibles
 * même après avoir quitté le mode. Et rappelle en permanence que le mode est
 * actif, puisque ce qu'on y fait ne quitte pas ce poste.
 */
export function LocalModeBanner() {
  const localMode = useLocalMode();

  useEffect(() => {
    navigator.serviceWorker?.register("/local-images-sw.js").catch(() => {});
  }, []);

  if (!localMode) return null;
  return (
    <div className="sticky top-0 z-30 flex items-center gap-2 border-b border-amber-300 bg-amber-50 px-4 py-1.5 text-xs text-amber-900">
      <HardDrive className="h-3.5 w-3.5 shrink-0" />
      <span>
        <strong>Mode local</strong> — les images que vous ajoutez restent dans ce navigateur, sur ce poste : rien n&apos;est
        envoyé au serveur.
      </span>
    </div>
  );
}
