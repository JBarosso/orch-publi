"use client";

import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import type { MeaItem } from "@/types";
import { generatePreviewHTML } from "./export";

interface MeaPreviewProps {
  items: MeaItem[];
}

export function MeaPreview({ items }: MeaPreviewProps) {
  const visibleItems = items.filter((item) => item.visible);

  const srcDoc = useMemo(() => {
    if (visibleItems.length === 0) return "";
    return generatePreviewHTML(items);
  }, [items, visibleItems.length]);

  if (visibleItems.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center rounded-lg border border-dashed border-border/60 bg-card text-sm text-muted-foreground">
        Aucune MEA visible. Ajoutez une MEA pour voir l&apos;aperçu.
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border/60 bg-white shadow-sm overflow-hidden p-3">
      <iframe
        srcDoc={srcDoc}
        className="w-full border-0"
        style={{ height: 800 }}
        sandbox="allow-scripts"
        title="Aperçu MEA"
      />
    </div>
  );
}
