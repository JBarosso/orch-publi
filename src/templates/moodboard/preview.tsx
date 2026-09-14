"use client";

import { useEffect, useRef, useState } from "react";
import type { MoodboardContent } from "@/types";
import { MoodboardCanvas } from "./moodboard-canvas";

interface MoodboardPreviewProps {
  content: MoodboardContent;
}

/**
 * Rendu en lecture seule du même canevas que l'éditeur — pas de HTML généré
 * à part pour ce template (il n'y a pas d'export), donc pas de dérive
 * possible entre "ce que je vois" et "ce qui sera reconstruit ailleurs".
 * Mis à l'échelle pour tenir dans la largeur du panneau d'aperçu.
 */
export function MoodboardPreview({ content }: MoodboardPreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      // Jamais agrandi au-delà de 100% : un petit tableau reste à sa taille réelle.
      setScale(Math.min(1, entry.contentRect.width / content.canvasWidth));
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [content.canvasWidth]);

  const comment = (content.comment ?? "").trim();

  return (
    <div className="relative overflow-hidden rounded-lg border border-border/60 bg-white shadow-sm">
      {comment && (
        <>
          <span
            className="pointer-events-none absolute inset-0 z-10 rounded-lg border-2 border-red-600"
            aria-hidden="true"
          />
          <span
            title={comment}
            aria-label="Commentaire"
            className="absolute right-1.5 top-1.5 z-10 flex h-5.5 w-5.5 items-center justify-center rounded bg-red-600 text-xs font-bold text-white shadow"
          >
            i
          </span>
        </>
      )}
      <div ref={containerRef} style={{ height: content.canvasHeight * scale }}>
        <div style={{ transform: `scale(${scale})`, transformOrigin: "top left" }}>
          <MoodboardCanvas content={content} interactive={false} />
        </div>
      </div>
    </div>
  );
}
