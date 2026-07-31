"use client";

import { useEffect, useId, useRef, useState, useMemo } from "react";
import type { MacaronItem } from "@/types";
import { generatePreviewHTML } from "./export";
import { useDebouncedValue } from "@/lib/use-debounced-value";

interface MacaronsV2PreviewProps {
  items: MacaronItem[];
}

export function MacaronsV2Preview({ items }: MacaronsV2PreviewProps) {
  const frameId = useId();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [iframeHeight, setIframeHeight] = useState(120);
  const debouncedItems = useDebouncedValue(items, 400);

  // Réaction instantanée (placeholder vide vs iframe) : basée sur les items
  // en direct, pas sur la version debounced.
  const visibleItems = items.filter((item) => item.visible);

  const srcDoc = useMemo(() => {
    const debouncedVisible = debouncedItems.filter((item) => item.visible);
    if (debouncedVisible.length === 0) return "";
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

  if (visibleItems.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center rounded-lg border border-dashed border-border/60 bg-card text-sm text-muted-foreground">
        Ajoutez des macarons pour voir l&apos;aperçu
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border/60 bg-white shadow-sm overflow-hidden">
      <iframe
        ref={iframeRef}
        srcDoc={srcDoc}
        className="w-full border-0"
        style={{ height: iframeHeight }}
        sandbox="allow-scripts"
        title="Aperçu quickaccess v2"
      />
    </div>
  );
}
