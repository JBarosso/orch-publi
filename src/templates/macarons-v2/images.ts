import type { MacaronsContent } from "@/types";
import { withPosition, type ImageEntry } from "@/lib/section-images";
import { resolveCustomFolder, resolveImageBaseName } from "@/lib/cms-image-path";

// Le nom et le dossier passent par les mêmes résolveurs que l'export HTML
// (cf. buildCmsImagePath) : c'est ce qui garantit que le fichier zippé et le
// <img src> généré pointent au même endroit.
export function getMacaronsV2Images(content: MacaronsContent): ImageEntry[] {
  const sectionPath = content?.customPath;
  return withPosition((content?.items ?? []).filter((i) => i.visible))
    .filter(({ item }) => item.imageUrl)
    .map(({ item, position }) => ({
      imageUrl: item.imageUrl,
      imageWeek: item.imageWeek,
      baseName: resolveImageBaseName(item, `quickaccess-${item.exportPosition ?? position}`),
      width: 200,
      height: 300,
      noLocale: item.isGlobalImage,
      customFolder: resolveCustomFolder(item, sectionPath) || undefined,
    }));
}
