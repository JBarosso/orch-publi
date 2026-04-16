"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import type { MacaronItem } from "@/types";
import { generatePreviewHTML } from "./export";

interface MacaronsPreviewProps {
  items: MacaronItem[];
}

export function MacaronsPreview({ items }: MacaronsPreviewProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [iframeHeight, setIframeHeight] = useState(120);

  const visibleItems = items.filter((item) => item.visible);

  const srcDoc = useMemo(() => {
    if (visibleItems.length === 0) return "";
    return generatePreviewHTML(items);
  }, [items, visibleItems.length]);

  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data?.type === "resize" && typeof e.data.height === "number") {
        setIframeHeight(e.data.height + 4);
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, []);

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
        title="Aperçu macarons"
      />
    </div>
  );
}
