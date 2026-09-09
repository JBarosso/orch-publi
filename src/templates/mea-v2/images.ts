import type { MeaV2Content } from "@/types";
import { withPosition, type ImageEntry } from "@/lib/section-images";
import { resolveCustomFolder, resolveImageBaseName } from "@/lib/cms-image-path";

// 4 cartes numérotées mea-1..4 + la carte focus figée sur mea-5. En mode
// vidéo, la vignette et la vidéo partagent le même nom de base (seule
// l'extension diffère côté CMS).
export function getMeaV2Images(content: MeaV2Content): ImageEntry[] {
  const sectionPath = content?.customPath;
  const entries: ImageEntry[] = withPosition(content?.cards ?? [])
    .filter(({ item }) => item.imageUrl)
    .map(({ item: card, position }) => ({
      imageUrl: card.imageUrl,
      imageWeek: card.imageWeek,
      baseName: resolveImageBaseName(card, `mea-${position}`),
      width: 1000,
      height: 600,
      noLocale: card.isGlobalImage,
      customFolder: resolveCustomFolder(card, sectionPath) || undefined,
    }));

  const focus = content?.focus;
  const focusFolder = focus ? resolveCustomFolder(focus, sectionPath) || undefined : undefined;
  if (focus?.imageUrl) {
    // Vignette (poster) : toujours exportée en image, même en mode vidéo
    entries.push({
      imageUrl: focus.imageUrl,
      imageWeek: focus.imageWeek,
      baseName: resolveImageBaseName(focus, "mea-5"),
      width: 600,
      height: 700,
      noLocale: focus.isGlobalImage,
      customFolder: focusFolder,
    });
  }
  if (focus?.mediaType === "video" && focus.videoUrl) {
    entries.push({
      imageUrl: focus.videoUrl,
      imageWeek: focus.imageWeek,
      baseName: resolveImageBaseName(focus, "mea-5"),
      width: null,
      height: null,
      noLocale: focus.isGlobalImage,
      customFolder: focusFolder,
      isVideo: true,
    });
  }

  return entries;
}
