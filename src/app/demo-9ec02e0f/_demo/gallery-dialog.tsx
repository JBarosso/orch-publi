"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DEMO_GALLERY, type DemoImageKind } from "./config";

// Médiathèque réduite : les visuels de démo du format demandé, sans upload.
// Vignettes carrées + libellé, comme la vraie médiathèque.
export function GalleryDialog({
  kind,
  onSelect,
  onClose,
}: {
  kind: DemoImageKind;
  onSelect: (url: string) => void;
  onClose: () => void;
}) {
  const images = DEMO_GALLERY.filter((image) => image.kind === kind);

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Médiathèque</DialogTitle>
          <DialogDescription>Choisissez un visuel pour cet emplacement.</DialogDescription>
        </DialogHeader>
        {/* Le défilement est porté par ce conteneur, pas par la grille : une
            grille à hauteur max tasse ses lignes au lieu de défiler. */}
        <div className="max-h-[60vh] overflow-y-auto pr-1">
          <div className="grid grid-cols-4 gap-3">
            {images.map((image) => (
              <button
                key={image.url}
                type="button"
                onClick={() => onSelect(image.url)}
                className="overflow-hidden rounded-lg border border-border/60 text-left transition-all hover:border-primary/60 hover:ring-2 hover:ring-primary/20"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={image.url}
                  alt={image.label}
                  loading="lazy"
                  className="aspect-square w-full bg-muted object-cover"
                />
                <span className="block truncate px-2 py-1.5 text-xs">{image.label}</span>
              </button>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
