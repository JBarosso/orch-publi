import type { CarouselContent } from "@/types";
import type { ExportContext } from "@/lib/cms-image-path";
import type { VideoEntry } from "@/lib/section-videos";
import { carouselSlidePath } from "./export";

export function getCarouselVideos(content: CarouselContent, ctx: ExportContext): VideoEntry[] {
  return (content?.slides ?? [])
    .map((slide, index) => ({ slide, slot: index + 1 }))
    .filter(({ slide }) => slide.mediaType === "video")
    .map(({ slide, slot }) => ({
      slot: `diapositive ${slot}`,
      sourceUrl: slide.videoUrl ?? "",
      cmsPath: `${carouselSlidePath(slide, slot, ctx)}.mp4`,
    }));
}
