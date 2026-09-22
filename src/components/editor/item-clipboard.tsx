"use client";

import { useState } from "react";
import { ClipboardCopy, ClipboardPaste, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { createClipboard } from "@/lib/clipboard-store";
import { ITEM_SECTIONS, type ItemSectionType } from "@/lib/section-items";
import type { TranslateStats } from "@/lib/translate-content";
import { usePasteContext } from "@/components/editor/paste-context";

// Copier/coller d'un item de section, d'un brief à l'autre. Un seul item à la
// fois : la dernière copie remplace la précédente. La section d'origine entière
// est gardée avec l'item : le figer sur sa semaine demande sa position dans
// cette section (cf. /api/sections/paste-item).
interface CopiedItem {
  sectionType: ItemSectionType;
  itemId: string;
  label: string;
  sourceContent: unknown;
  sourceWeek: number;
  sourceLocale: string;
}

const clipboard = createClipboard<CopiedItem>("orch-publi:item-clipboard");

/** Message de fin de collage, avec le bilan de traduction s'il y en a eu une. */
export function pasteSuccessMessage(base: string, translation: TranslateStats | null | undefined): string {
  if (!translation) return base;
  const missing = translation.missing + translation.ambiguous;
  return `${base} — ${translation.translated} texte(s) traduit(s)${missing ? `, ${missing} à vérifier (voir commentaire)` : ""}`;
}

function labelOf(item: Record<string, unknown> | undefined): string {
  const label = [item?.label, item?.title, item?.text].find((v) => typeof v === "string" && v.trim());
  return (label as string | undefined)?.trim().split("\n")[0] ?? "Item";
}

/**
 * Fonction de copie d'un item (par son id) de la section décrite par
 * `sourceContent`, ou undefined hors d'un brief.
 */
export function useCopyItem(sectionType: ItemSectionType, sourceContent: unknown) {
  const ctx = usePasteContext();
  if (!ctx) return undefined;
  return (itemId: string) => {
    const list = (sourceContent as Record<string, unknown>)?.[ITEM_SECTIONS[sectionType].key];
    const item = Array.isArray(list) ? list.find((i) => i?.id === itemId) : undefined;
    const label = labelOf(item);
    const ok = clipboard.write({
      sectionType,
      itemId,
      label,
      sourceContent,
      sourceWeek: ctx.week,
      sourceLocale: ctx.locale,
    });
    if (ok) toast.success(`« ${label} » copié — « Coller » l'ajoute à une section du même type`);
    else toast.error("Copie impossible : le navigateur refuse le stockage local");
  };
}

/** Icône « copier » à poser à côté de la corbeille d'un item. */
export function CopyItemButton({ onClick }: { onClick: () => void }) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="h-6 w-6 shrink-0 text-muted-foreground/40 hover:text-foreground"
      title="Copier l'item (pour le coller dans une section du même type, ici ou dans un autre brief)"
      onClick={onClick}
    >
      <ClipboardCopy className="h-3 w-3" />
    </Button>
  );
}

/**
 * Bouton « Coller », à gauche de « Ajouter » : visible seulement si l'item
 * copié peut aller dans cette section. Propose de traduire s'il vient d'une
 * autre langue ; `onPaste` reçoit l'item prêt (nouvel id, semaine figée).
 */
export function PasteItemButton<T>({
  sectionType,
  onPaste,
  disabled = false,
}: {
  sectionType: ItemSectionType;
  onPaste: (item: T) => void;
  disabled?: boolean;
}) {
  const ctx = usePasteContext();
  const copied = clipboard.useValue();
  const [busy, setBusy] = useState(false);
  if (!ctx || !copied || ITEM_SECTIONS[copied.sectionType]?.kind !== ITEM_SECTIONS[sectionType].kind) return null;

  const paste = async () => {
    let translate = false;
    if (copied.sourceLocale.toUpperCase() !== ctx.locale.toUpperCase()) {
      const choice = await ctx.askTranslate(copied.sourceLocale, ctx.locale);
      if (choice === null) return;
      translate = choice;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/sections/paste-item", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: sectionType,
          sourceType: copied.sectionType,
          sourceContent: copied.sourceContent,
          itemId: copied.itemId,
          from: { week: copied.sourceWeek, locale: copied.sourceLocale },
          to: { week: ctx.week, locale: ctx.locale },
          translate,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.item) {
        toast.error(data?.error ?? "Impossible de coller l'item");
        return;
      }
      onPaste(data.item as T);
      toast.success(pasteSuccessMessage(`« ${copied.label} » collé`, data.translation));
    } catch {
      toast.error("Impossible de coller l'item");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={paste}
      disabled={disabled || busy}
      title={`Coller « ${copied.label} »`}
    >
      {busy ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <ClipboardPaste className="mr-1 h-3 w-3" />}
      Coller
    </Button>
  );
}
