"use client";

import { X } from "lucide-react";
import { formatCopyAge } from "@/lib/clipboard-store";

/**
 * Repère posé à gauche d'un bouton « Coller » : ce qui est dans le
 * presse-papiers, d'où il vient, depuis quand — et de quoi le vider.
 */
export function ClipboardChip({
  label,
  locale,
  week,
  copiedAt,
  onClear,
}: {
  label: string;
  locale: string;
  week: number;
  copiedAt?: string;
  onClear: () => void;
}) {
  const details = [locale.toUpperCase(), `S${week}`, formatCopyAge(copiedAt)].filter(Boolean).join(" · ");
  return (
    <span
      className="flex min-w-0 items-center gap-1 rounded-md bg-muted/60 py-0.5 pr-0.5 pl-2 text-[11px] text-muted-foreground"
      title={`Presse-papiers : « ${label} » (${details})`}
    >
      <span className="max-w-40 truncate">« {label} »</span>
      <span className="shrink-0">· {details}</span>
      <button
        type="button"
        onClick={onClear}
        title="Vider le presse-papiers"
        aria-label="Vider le presse-papiers"
        className="shrink-0 rounded p-0.5 hover:bg-muted hover:text-foreground"
      >
        <X className="h-3 w-3" />
      </button>
    </span>
  );
}
