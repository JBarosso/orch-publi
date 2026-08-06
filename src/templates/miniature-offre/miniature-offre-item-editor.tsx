"use client";

import { useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Trash2, Image as ImageIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ConfirmDeleteDialog } from "@/components/editor/confirm-delete-dialog";
import { WeekField } from "@/components/editor/week-field";
import type { MiniatureOffreItem } from "@/types";
import { cn } from "@/lib/utils";
import { useFileDrop } from "@/lib/use-file-drop";

interface MiniatureOffreItemEditorProps {
  item: MiniatureOffreItem;
  isActive: boolean;
  briefWeek: number;
  onUpdate: (updates: Partial<MiniatureOffreItem>) => void;
  onRemove: () => void;
  onOpenMediaLibrary: () => void;
  onDropFile?: (file: File) => void;
}

export function MiniatureOffreItemEditor({
  item,
  isActive,
  briefWeek,
  onUpdate,
  onRemove,
  onOpenMediaLibrary,
  onDropFile,
}: MiniatureOffreItemEditorProps) {
  const { isDraggingOver, dropHandlers } = useFileDrop((file) => onDropFile?.(file));
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <>
      <div
        ref={setNodeRef}
        style={style}
        className={cn(
          "flex items-start gap-3 rounded-lg border border-border/60 bg-card p-3 transition-all",
          isDragging && "shadow-lg opacity-50 scale-[1.02]",
          isActive && "ring-2 ring-primary/30",
        )}
      >
        <button
          type="button"
          className="mt-2.5 cursor-grab touch-none text-muted-foreground/40 hover:text-muted-foreground transition-colors"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4" />
        </button>

        <div className="flex min-w-0 flex-1 flex-wrap items-start gap-3">
          <button
            type="button"
            onClick={onOpenMediaLibrary}
            {...dropHandlers}
            className={cn(
              "shrink-0 flex h-20 w-20 items-center justify-center overflow-hidden rounded border-2 border-dashed border-muted-foreground/20 bg-muted transition-all hover:border-primary/40 hover:bg-primary/5",
              isDraggingOver && "border-primary bg-primary/10 ring-2 ring-primary/30",
            )}
            title="301×301 px"
          >
            {item.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={item.imageUrl}
                alt={item.label}
                className="h-full w-full object-cover"
              />
            ) : (
              <ImageIcon className="h-4 w-4 text-muted-foreground/40" />
            )}
          </button>

          <div className="min-w-60 flex-1 space-y-1.5">
            <WeekField
              imageWeek={item.imageWeek}
              briefWeek={briefWeek}
              imageId={item.imageId}
              exportPosition={item.exportPosition}
              onChange={(imageWeek) => onUpdate({ imageWeek })}
            />

            <Input
              placeholder="Label"
              value={item.label}
              onChange={(e) => onUpdate({ label: e.target.value })}
              className="h-8 text-sm"
            />
          </div>
        </div>

        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 shrink-0 text-muted-foreground/40 hover:text-destructive"
          onClick={() => setConfirmDeleteOpen(true)}
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>

      <ConfirmDeleteDialog
        open={confirmDeleteOpen}
        onOpenChange={setConfirmDeleteOpen}
        title="Supprimer cette image ?"
        description="Cette action est irréversible. L'image sera définitivement supprimée."
        onConfirm={onRemove}
      />
    </>
  );
}
