"use client";

import { Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

// Retire l'image d'un emplacement de section. Le fichier reste dans la
// médiathèque : seul le lien depuis la section disparaît. À placer dans un
// conteneur `relative group/slot` à côté du bouton d'image (jamais dedans :
// un bouton ne peut pas en contenir un autre).
/** Variante posée à côté d'une petite vignette en ligne (titre image, logo), toujours visible. */
export const INLINE_REMOVE =
  "static shrink-0 bg-transparent p-1 text-muted-foreground/60 opacity-100 hover:bg-transparent hover:text-destructive";

export function ImageRemoveButton({ onRemove, className }: { onRemove: () => void; className?: string }) {
  return (
    <button
      type="button"
      onClick={onRemove}
      title="Retirer l'image (elle reste dans la médiathèque)"
      aria-label="Retirer l'image"
      className={cn(
        "absolute right-0.5 top-0.5 z-10 rounded bg-black/60 p-1 text-white opacity-0 transition-opacity hover:bg-red-600/90 focus-visible:opacity-100 group-hover/slot:opacity-100",
        className,
      )}
    >
      <Trash2 className="h-3 w-3" />
    </button>
  );
}
