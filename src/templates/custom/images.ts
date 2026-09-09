import type { CustomContent } from "@/types";
import type { ImageEntry } from "@/lib/section-images";

// Sections personnalisées : nommage par imageId (pas de position), dimensions
// libres — on n'impose aucun redimensionnement.
export function getCustomImages(content: CustomContent): ImageEntry[] {
  return (content?.blocks ?? [])
    .filter((b) => b.type === "image" && b.imageUrl)
    .map((block) => ({
      imageUrl: block.imageUrl,
      imageWeek: block.imageWeek,
      baseName: `custom-${block.imageId}`,
      width: null,
      height: null,
    }));
}
