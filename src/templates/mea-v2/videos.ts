import type { MeaV2Content } from "@/types";
import { buildCmsImagePath, type ExportContext } from "@/lib/cms-image-path";
import type { VideoEntry } from "@/lib/section-videos";

export function getMeaV2Videos(content: MeaV2Content, ctx: ExportContext): VideoEntry[] {
  const focus = content?.focus;
  if (focus?.mediaType !== "video") return [];
  return [
    {
      slot: "carte focus",
      sourceUrl: focus.videoUrl ?? "",
      // Même chemin que le <video src> exporté (cf. focusCardHTML).
      cmsPath: `${buildCmsImagePath(focus, ctx, focus.imageWeek, "mea-5", content?.customPath)}.mp4`,
    },
  ];
}
