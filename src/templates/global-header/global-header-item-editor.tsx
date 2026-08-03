"use client";

import { useState } from "react";
import { GripVertical, Save, Trash2 } from "lucide-react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { LinkFields } from "@/components/editor/link-fields";
import type { GlobalHeaderItem, GlobalHeaderLibraryItem, Locale } from "@/types";
import { cn } from "@/lib/utils";
import { LibraryItemPicker } from "./library-item-picker";

interface GlobalHeaderItemEditorProps {
  item: GlobalHeaderItem;
  label: string;
  locale: Locale;
  onUpdate: (updates: Partial<GlobalHeaderItem>) => void;
  onRemove: () => void;
}

export function GlobalHeaderItemEditor({
  item,
  label,
  locale,
  onUpdate,
  onRemove,
}: GlobalHeaderItemEditorProps) {
  const [saving, setSaving] = useState(false);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
  });

  const style = { transform: CSS.Transform.toString(transform), transition };

  const loadFromLibrary = (libItem: GlobalHeaderLibraryItem) => {
    onUpdate({
      sourceItemId: libItem.id,
      label: libItem.label,
      text: libItem.text,
      linkType: libItem.linkType,
      cgid: libItem.cgid,
      cid: libItem.cid,
      link: libItem.link,
    });
  };

  const saveToLibrary = async () => {
    if (!item.label.trim()) {
      toast.error("Un label est requis pour enregistrer dans la bibliothèque");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        locale,
        label: item.label,
        text: item.text,
        linkType: item.linkType,
        cgid: item.cgid,
        cid: item.cid,
        link: item.link,
      };
      const res = await fetch("/api/global-header-items", {
        method: item.sourceItemId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(item.sourceItemId ? { id: item.sourceItemId, ...payload } : payload),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        toast.error(data?.error ?? "Erreur lors de l'enregistrement");
        return;
      }
      onUpdate({ sourceItemId: data.id });
      toast.success("Enregistré dans la bibliothèque");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "space-y-2 rounded-lg border border-border/60 bg-card p-3",
        isDragging && "shadow-lg opacity-50 scale-[1.02]",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="cursor-grab touch-none text-muted-foreground/40 hover:text-muted-foreground transition-colors"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-4 w-4" />
          </button>
          <span className="text-xs font-semibold text-muted-foreground">{label}</span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 shrink-0 text-muted-foreground/40 hover:text-destructive"
          onClick={onRemove}
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>

      <LibraryItemPicker locale={locale} onPick={loadFromLibrary} />

      <div className="flex items-center gap-2">
        <span className="text-[10px] text-muted-foreground/70 shrink-0">Label</span>
        <Input
          placeholder="Label (pour retrouver cet item dans la bibliothèque)"
          value={item.label}
          onChange={(e) => onUpdate({ label: e.target.value, sourceItemId: null })}
          className="h-8 flex-1 text-sm"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={saveToLibrary}
          disabled={saving}
          className="h-8 shrink-0 text-xs"
        >
          <Save className="mr-1 h-3 w-3" />
          {item.sourceItemId ? "Mettre à jour" : "Enregistrer"}
        </Button>
      </div>

      <Textarea
        placeholder="Texte du message"
        value={item.text}
        onChange={(e) => onUpdate({ text: e.target.value })}
        rows={2}
        className="min-h-14 resize-none text-sm"
      />

      <div className="flex items-center gap-2 rounded-md bg-muted/40 p-1.5">
        <LinkFields
          linkType={item.linkType}
          cgid={item.cgid}
          cid={item.cid}
          link={item.link}
          onChange={onUpdate}
          allowNone
          cgidPlaceholder="ex: soldes"
          cidPlaceholder="ex: alma"
          selectClassName="h-7 w-36 shrink-0 text-xs"
        />
      </div>

      <div className="space-y-1">
        <span className="text-[11px] text-muted-foreground">commentaire</span>
        <Textarea
          placeholder="commentaire..."
          value={item.comment ?? ""}
          onChange={(e) => onUpdate({ comment: e.target.value })}
          rows={2}
          className={cn(
            "min-h-10 resize-none text-sm",
            (item.comment ?? "").trim()
              ? "border-red-500 border-l-[3px]! border-l-red-500! focus-visible:ring-2 focus-visible:ring-red-500/40"
              : "",
          )}
        />
      </div>
    </div>
  );
}
