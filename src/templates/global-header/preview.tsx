"use client";

import { useEffect, useId, useRef, useState, useMemo } from "react";
import type { GlobalHeaderContent } from "@/types";
import { generatePreviewHTML } from "./export";

interface GlobalHeaderPreviewProps {
  content: GlobalHeaderContent;
}

export function GlobalHeaderPreview({ content }: GlobalHeaderPreviewProps) {
  const frameId = useId();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [iframeHeight, setIframeHeight] = useState(120);

  const srcDoc = useMemo(() => generatePreviewHTML(content, frameId), [content, frameId]);

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

  if ((content.items ?? []).length === 0) {
    return (
      <div className="flex h-24 items-center justify-center rounded-lg border border-dashed border-border/60 bg-card text-sm text-muted-foreground">
        Ajoutez un item pour voir l&apos;aperçu
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
        title="Aperçu global header"
      />
    </div>
  );
}
