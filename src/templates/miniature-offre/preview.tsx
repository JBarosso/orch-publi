"use client";

import { useEffect, useId, useRef, useState, useMemo } from "react";
import type { MiniatureOffreItem } from "@/types";
import { generatePreviewHTML } from "./export";
import { useDebouncedValue } from "@/lib/use-debounced-value";

interface MiniatureOffrePreviewProps {
  items: MiniatureOffreItem[];
}

export function MiniatureOffrePreview({ items }: MiniatureOffrePreviewProps) {
  const frameId = useId();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [iframeHeight, setIframeHeight] = useState(120);
  const debouncedItems = useDebouncedValue(items, 400);

  const srcDoc = useMemo(() => {
    if (debouncedItems.length === 0) return "";
    return generatePreviewHTML(debouncedItems, frameId);
  }, [debouncedItems, frameId]);

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

  if (items.length === 0) {
    return (
      <div className="flex h-24 items-center justify-center rounded-lg border border-dashed border-border/60 bg-card text-sm text-muted-foreground">
        Ajoutez une image pour voir l&apos;aperçu
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border/60 bg-white shadow-sm overflow-hidden p-3">
      <iframe
        ref={iframeRef}
        srcDoc={srcDoc}
        className="w-full border-0"
        style={{ height: iframeHeight }}
        sandbox="allow-scripts"
        title="Aperçu miniature offre"
      />
    </div>
  );
}
