import { describe, it, expect } from "vitest";
import { getSectionVideos, generateSectionHTML } from "@/templates/registry";
import { createEmptyCarouselContent, createEmptyCarouselSlide } from "@/templates/carousel/schema";
import { createEmptyMeaV2Content } from "@/templates/mea-v2/schema";

const CTX = { year: 2026, week: 40, locale: "fr" };
const SOURCE = "https://sharepoint.test/promo.mp4";

// L'intégrateur télécharge la vidéo à cette adresse et la dépose au chemin
// indiqué : si ce chemin s'écarte de celui du HTML exporté, la vidéo est
// déposée au mauvais endroit et la page reste muette.
describe("vidéos à récupérer", () => {
  it("carousel : chemin identique à celui du <video> exporté", () => {
    const content = createEmptyCarouselContent();
    content.slides = [
      { ...createEmptyCarouselSlide("s1"), mediaType: "video", videoUrl: SOURCE, imageUrl: "https://x/p.jpg" },
    ];

    const [video] = getSectionVideos("carousel", content, CTX);
    expect(video.sourceUrl).toBe(SOURCE);
    expect(video.cmsPath).toBe("homepage/2026/wk40/fr/carousel-1.mp4");
    expect(generateSectionHTML("carousel", content, CTX)).toContain(`${video.cmsPath}?$staticlink$`);
  });

  it("MEA v2 : suit le chemin personnalisé de la section", () => {
    const content = createEmptyMeaV2Content();
    content.focus = { ...content.focus!, title: "Focus", mediaType: "video", videoUrl: SOURCE };
    const withPath = { ...content, customPath: "landing-pages/bebe" };

    const [video] = getSectionVideos("mea_v2", withPath, CTX);
    expect(video.cmsPath).toBe("landing-pages/bebe/mea-5.mp4");
    expect(generateSectionHTML("mea_v2", withPath, CTX)).toContain(`${video.cmsPath}?$staticlink$`);
  });

  it("rien à récupérer pour une section sans vidéo", () => {
    expect(getSectionVideos("carousel", createEmptyCarouselContent(), CTX)).toEqual([]);
    expect(getSectionVideos("macarons_v2", { items: [] }, CTX)).toEqual([]);
  });
});
