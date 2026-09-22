import { Video } from "lucide-react";
import type { Asset } from "@/types";

// Vignette carrée d'un asset. Une vidéo n'est jamais chargée ici (plusieurs Mo
// chacune, re-téléchargés à chaque ouverture de la médiathèque) : simple tuile.
export function AssetThumbnail({ asset }: { asset: Pick<Asset, "url" | "label" | "mimeType"> }) {
  if (asset.mimeType?.startsWith("video/")) {
    return (
      <div
        role="img"
        aria-label={asset.label || "Vidéo"}
        className="flex aspect-square w-full flex-col items-center justify-center gap-1.5 bg-muted text-muted-foreground"
      >
        <Video className="h-8 w-8" />
        <span className="text-[10px] font-medium uppercase tracking-wide">Vidéo</span>
      </div>
    );
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={asset.url} alt={asset.label} className="aspect-square w-full object-cover" />;
}
