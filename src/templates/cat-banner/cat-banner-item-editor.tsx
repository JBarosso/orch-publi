"use client";

import { useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Trash2, Image as ImageIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ConfirmDeleteDialog } from "@/components/editor/confirm-delete-dialog";
import { WeekField } from "@/components/editor/week-field";
import type { CatBannerItem } from "@/types";
import { cn } from "@/lib/utils";
import { useFileDrop } from "@/lib/use-file-drop";

interface CatBannerItemEditorProps {
  item: CatBannerItem;
  isActive: boolean;
  briefWeek: number;
  onUpdate: (updates: Partial<CatBannerItem>) => void;
  onRemove: () => void;
  onOpenMediaLibrary: (slot: "desktop" | "mobile") => void;
  onDropFile?: (slot: "desktop" | "mobile", file: File) => void;
}

function ImageSlot({
  label,
  imageUrl,
  onOpenMediaLibrary,
  onDropFile,
}: {
  label: string;
  imageUrl: string;
  onOpenMediaLibrary: () => void;
  onDropFile?: (file: File) => void;
}) {
  const { isDraggingOver, dropHandlers } = useFileDrop((file) => onDropFile?.(file));
  return (
    <div className="flex w-32 shrink-0 flex-col items-center gap-1">
      <button
        type="button"
        onClick={onOpenMediaLibrary}
        {...dropHandlers}
        className={cn(
          "flex h-20 w-32 items-center justify-center overflow-hidden rounded border-2 border-dashed border-muted-foreground/20 bg-muted transition-all hover:border-primary/40 hover:bg-primary/5",
          isDraggingOver && "border-primary bg-primary/10 ring-2 ring-primary/30",
        )}
      >
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <ImageIcon className="h-4 w-4 text-muted-foreground/40" />
        )}
      </button>
      <span className="text-[9px] text-muted-foreground/60">{label}</span>
    </div>
  );
}

export function CatBannerItemEditor({
  item,
  isActive,
  briefWeek,
  onUpdate,
  onRemove,
  onOpenMediaLibrary,
  onDropFile,
}: CatBannerItemEditorProps) {
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
  });

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
          <div className="flex shrink-0 gap-2">
            <ImageSlot
              label="Desktop"
              imageUrl={item.desktopImageUrl}
              onOpenMediaLibrary={() => onOpenMediaLibrary("desktop")}
              onDropFile={onDropFile ? (file) => onDropFile("desktop", file) : undefined}
            />
            <ImageSlot
              label="Mobile"
              imageUrl={item.mobileImageUrl}
              onOpenMediaLibrary={() => onOpenMediaLibrary("mobile")}
              onDropFile={onDropFile ? (file) => onDropFile("mobile", file) : undefined}
            />
          </div>

          <div className="min-w-70 flex-1 space-y-1.5">
            <WeekField
              imageWeek={item.imageWeek}
              briefWeek={briefWeek}
              imageId={item.desktopImageId}
              exportPosition={item.exportPosition}
              onChange={(imageWeek) => onUpdate({ imageWeek })}
            />

            <Input
              placeholder="Label (ex: Maxi Cosi)"
              value={item.label}
              onChange={(e) => onUpdate({ label: e.target.value })}
              className="h-8 text-sm"
            />

            <Input
              placeholder="https://... ou /fr/puericulture/..."
              value={item.url}
              onChange={(e) => onUpdate({ url: e.target.value })}
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
        title="Supprimer cette bannière ?"
        description="Cette action est irréversible. La bannière sera définitivement supprimée."
        onConfirm={onRemove}
      />
    </>
  );
}
