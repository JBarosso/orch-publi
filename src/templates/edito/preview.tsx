"use client";

import { useEffect, useId, useRef, useState, useMemo } from "react";
import type { EditoCard } from "@/types";
import { generatePreviewHTML } from "./export";

interface EditoPreviewProps {
  items: EditoCard[];
}

export function EditoPreview({ items }: EditoPreviewProps) {
  const frameId = useId();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [iframeHeight, setIframeHeight] = useState(120);

  const srcDoc = useMemo(() => {
    if (items.length === 0) return "";
    return generatePreviewHTML(items, frameId);
  }, [items, frameId]);

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
      <div className="flex h-48 items-center justify-center rounded-lg border border-dashed border-border/60 bg-card text-sm text-muted-foreground">
        Ajoutez des cartes edito pour voir l&apos;aperçu
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
        title="Aperçu edito"
      />
    </div>
  );
}
