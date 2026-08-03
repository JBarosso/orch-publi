"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { LinkFields } from "@/components/editor/link-fields";
import type { ArianeLink } from "@/types";

interface ArianeLinkEditorProps {
  link: ArianeLink;
  onUpdate: (updates: Partial<ArianeLink>) => void;
  onRemove: () => void;
}

export function ArianeLinkEditor({ link, onUpdate, onRemove }: ArianeLinkEditorProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: link.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-2 rounded-lg border border-border/60 bg-card p-2 ${isDragging ? "shadow-lg opacity-50 scale-[1.02]" : ""}`}
    >
      <button
        type="button"
        className="cursor-grab touch-none text-muted-foreground/40 hover:text-muted-foreground transition-colors"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </button>

      <Input
        placeholder="Libellé (ex: Naissance 0-12 mois)"
        value={link.label}
        onChange={(e) => onUpdate({ label: e.target.value })}
        className="h-8 flex-1 text-sm"
      />

      <LinkFields
        linkType={link.linkType}
        cgid={link.cgid}
        cid={link.cid}
        link={link.link}
        onChange={onUpdate}
        cgidPlaceholder="ex: bb-na"
        selectClassName="h-8 w-20 shrink-0 text-xs"
        inputClassName="h-8 w-40 text-sm"
      />

      <button
        type="button"
        onClick={onRemove}
        className="text-muted-foreground/40 hover:text-destructive transition-colors p-0.5"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
