"use client";

import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import type { MeaItem } from "@/types";
import { generatePreviewHTML } from "./export";
import { useDebouncedValue } from "@/lib/use-debounced-value";

interface MeaPreviewProps {
  items: MeaItem[];
}

export function MeaPreview({ items }: MeaPreviewProps) {
  const debouncedItems = useDebouncedValue(items, 400);

  // Réaction instantanée (placeholder vide vs iframe) : basée sur les items
  // en direct, pas sur la version debounced.
  const visibleItems = items.filter((item) => item.visible);

  const srcDoc = useMemo(() => {
    const debouncedVisible = debouncedItems.filter((item) => item.visible);
    if (debouncedVisible.length === 0) return "";
    return generatePreviewHTML(debouncedItems);
  }, [debouncedItems]);

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
