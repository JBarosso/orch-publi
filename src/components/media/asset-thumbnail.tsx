import { Video } from "lucide-react";
import type { Asset } from "@/types";

// Vignette carrée d'un asset. Pour une vidéo, le navigateur affiche lui-même
// la première frame (preload="metadata", #t=0.1 force le rendu de l'image
// sur les navigateurs qui sinon laissent un cadre noir) ; le badge dit que
// c'est une vidéo.
export function AssetThumbnail({ asset }: { asset: Pick<Asset, "url" | "label" | "mimeType"> }) {
  if (asset.mimeType?.startsWith("video/")) {
    return (
      <div className="relative">
        <video
          src={`${asset.url}#t=0.1`}
          preload="metadata"
          muted
          playsInline
          aria-label={asset.label || "Vidéo"}
          className="pointer-events-none aspect-square w-full bg-muted object-cover"
        />
        <span className="absolute bottom-1 left-1 flex items-center gap-1 rounded bg-black/60 px-1.5 py-0.5 text-[10px] text-white">
          <Video className="h-3 w-3" />
          Vidéo
        </span>
      </div>
    );
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={asset.url} alt={asset.label} className="aspect-square w-full object-cover" />;
}
