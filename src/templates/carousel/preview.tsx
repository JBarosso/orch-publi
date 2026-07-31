"use client";

import { useEffect, useId, useRef, useState, useMemo } from "react";
import type { CarouselContent } from "@/types";
import { generatePreviewHTML } from "./export";
import { useDebouncedValue } from "@/lib/use-debounced-value";

interface CarouselPreviewProps {
  content: CarouselContent;
}

export function CarouselPreview({ content }: CarouselPreviewProps) {
  const frameId = useId();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [iframeHeight, setIframeHeight] = useState(400);
  const debouncedContent = useDebouncedValue(content, 400);

  const srcDoc = useMemo(() => generatePreviewHTML(debouncedContent, frameId), [debouncedContent, frameId]);

  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (
        e.data?.type === "resize" &&
        e.data.frameId === frameId &&
        typeof e.data.height === "number"
      ) {
        setIframeHeight(e.data.height + 4);
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [frameId]);

  return (
    <div className="rounded-lg border border-border/60 bg-white shadow-sm overflow-hidden">
      <iframe
        ref={iframeRef}
        srcDoc={srcDoc}
        className="w-full border-0"
        style={{ height: iframeHeight }}
        sandbox="allow-scripts"
        title="Aperçu carousel"
      />
    </div>
  );
}
