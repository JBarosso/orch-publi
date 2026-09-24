"use client";

import { useState } from "react";
import type { CarouselContent } from "@/types";
import { cn } from "@/lib/utils";
import { carouselFrameName } from "./preview";

/**
 * Pastilles posées à droite du titre de l'aperçu : les indicateurs du carousel
 * lui-même sont difficiles à viser (petits, parfois cachés derrière le visuel).
 * Elles pilotent l'iframe de la section par message — le rendu, lui, ne change
 * pas d'un pixel.
 */
export function CarouselPreviewControls({ content, sectionId }: { content: unknown; sectionId: string }) {
  const slides = (content as CarouselContent)?.slides ?? [];
  const [current, setCurrent] = useState(0);
  if (slides.length < 2) return null;

  const goTo = (index: number) => {
    const frame = document.querySelector<HTMLIFrameElement>(`iframe[name="${carouselFrameName(sectionId)}"]`);
    frame?.contentWindow?.postMessage({ type: "goto-slide", index }, "*");
    setCurrent(index);
  };

  return (
    <div className="flex shrink-0 items-center gap-1">
      {slides.map((slide, index) => (
        <button
          key={slide.id}
          type="button"
          onClick={() => goTo(index)}
          title={`Diapositive ${index + 1}${slide.titleText ? ` — ${slide.titleText.replace(/\n/g, " ")}` : ""}`}
          aria-label={`Afficher la diapositive ${index + 1}`}
          aria-current={index === current}
          className={cn(
            "h-2 w-4 rounded-full transition-colors",
            index === current ? "bg-foreground/70" : "bg-muted-foreground/25 hover:bg-muted-foreground/50",
          )}
        />
      ))}
    </div>
  );
}
