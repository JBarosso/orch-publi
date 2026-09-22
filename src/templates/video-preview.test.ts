import { describe, it, expect } from "vitest";
import { generatePreviewHTML as carouselPreview } from "./carousel/export";
import { createEmptyCarouselContent, createEmptyCarouselSlide } from "./carousel/schema";
import { generatePreviewHTML as meaV2Preview } from "./mea-v2/export";
import { createEmptyMeaV2Content } from "./mea-v2/schema";

const VIDEO = "https://store.public.blob.vercel-storage.com/clip.mp4";
const POSTER = "https://store.public.blob.vercel-storage.com/poster.jpg";

// L'aperçu est régénéré à chaque modification : y charger la vidéo la
// re-téléchargeait entière à chaque fois (quota Blob épuisé). Poster seul.
describe("aperçus vidéo", () => {
  it("carousel : poster affiché, vidéo jamais chargée", () => {
    const content = createEmptyCarouselContent();
    content.slides = [{ ...createEmptyCarouselSlide("s1"), mediaType: "video", videoUrl: VIDEO, imageUrl: POSTER }];
    const html = carouselPreview(content);
    expect(html).toContain(`poster="${POSTER}"`);
    expect(html).not.toContain(VIDEO);
  });

  it("MEA v2 : poster affiché, vidéo jamais chargée", () => {
    const content = createEmptyMeaV2Content();
    content.focus = { ...content.focus!, title: "Focus", mediaType: "video", videoUrl: VIDEO, imageUrl: POSTER };
    const html = meaV2Preview(content);
    expect(html).toContain(`poster="${POSTER}"`);
    expect(html).not.toContain(VIDEO);
  });
});
