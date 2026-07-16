"use client";

import { useEffect, useId, useMemo, useState } from "react";
import type { CustomContent } from "@/types";
import { generatePreviewHTML } from "./export";

interface CustomPreviewProps {
  content: CustomContent;
}

export function CustomPreview({ content }: CustomPreviewProps) {
  const frameId = useId();
  const [iframeHeight, setIframeHeight] = useState(120);

  const renderableBlocks = (content.blocks ?? []).filter((b) =>
    b.type === "image" ? !!b.imageUrl : !!b.text.trim(),
  );

  const srcDoc = useMemo(() => {
    if (renderableBlocks.length === 0) return "";
    return generatePreviewHTML(content, frameId);
  }, [content, frameId, renderableBlocks.length]);

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

  if (renderableBlocks.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center rounded-lg border border-dashed border-border/60 bg-card text-sm text-muted-foreground">
        Ajoutez des blocs pour voir l&apos;aperçu
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border/60 bg-white shadow-sm overflow-hidden">
      <iframe
        srcDoc={srcDoc}
        className="w-full border-0"
        style={{ height: iframeHeight }}
        sandbox="allow-scripts"
        title="Aperçu section personnalisée"
      />
    </div>
  );
}
