"use client";

import type { CarouselContent, CarouselSlide } from "@/types";
import { CarouselSlideEditor } from "./carousel-slide-editor";

interface CarouselEditorProps {
  content: CarouselContent;
  briefWeek: number;
  onChange: (content: CarouselContent) => void;
  // "slide-0" | "slide-1" ciblent le fond, "title-0" | "title-1" le titre image
  onOpenMediaLibrary: (target: string) => void;
  onDropFile?: (target: string, file: File) => void;
  onOpenVideoUpload: (slideIndex: number) => void;
}

export function CarouselEditor({
  content,
  briefWeek,
  onChange,
  onOpenMediaLibrary,
  onDropFile,
  onOpenVideoUpload,
}: CarouselEditorProps) {
  const slides = content.slides ?? [];

  const updateSlide = (index: number, updates: Partial<CarouselSlide>) => {
    onChange({
      ...content,
      slides: slides.map((s, i) => (i === index ? { ...s, ...updates } : s)),
    });
  };

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-muted-foreground">Carousel (2 diapositives)</h3>
      <div className="space-y-2">
        {slides.map((slide, i) => (
          <CarouselSlideEditor
            key={slide.id}
            slide={slide}
            label={`Diapositive ${i + 1}`}
            briefWeek={briefWeek}
            onUpdate={(updates) => updateSlide(i, updates)}
            onOpenMediaLibrary={() => onOpenMediaLibrary(`slide-${i}`)}
            onDropFile={onDropFile ? (file) => onDropFile(`slide-${i}`, file) : undefined}
            onOpenTitleImageLibrary={() => onOpenMediaLibrary(`title-${i}`)}
            onDropTitleFile={onDropFile ? (file) => onDropFile(`title-${i}`, file) : undefined}
            onOpenVideoUpload={() => onOpenVideoUpload(i)}
          />
        ))}
      </div>
    </div>
  );
}
