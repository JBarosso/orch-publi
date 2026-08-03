"use client";

import { useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Trash2, Image as ImageIcon } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { ConfirmDeleteDialog } from "@/components/editor/confirm-delete-dialog";
import { LinkFields } from "@/components/editor/link-fields";
import { WeekField } from "@/components/editor/week-field";
import type { MacaronItem } from "@/types";
import { cn } from "@/lib/utils";
import { useFileDrop } from "@/lib/use-file-drop";

interface MacaronItemEditorProps {
  item: MacaronItem;
  isActive: boolean;
  briefWeek: number;
  onUpdate: (updates: Partial<MacaronItem>) => void;
  onRemove: () => void;
  onOpenMediaLibrary: () => void;
  onDropFile?: (file: File) => void;
}

export function MacaronItemEditor({
  item,
  isActive,
  briefWeek,
  onUpdate,
  onRemove,
  onOpenMediaLibrary,
  onDropFile,
}: MacaronItemEditorProps) {
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
          !item.visible && "opacity-50",
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
              "shrink-0 flex size-17.5 items-center justify-center overflow-hidden rounded-full border-2 border-dashed border-muted-foreground/20 bg-muted transition-all hover:border-primary/40 hover:bg-primary/5",
              isDraggingOver && "border-primary bg-primary/10 ring-2 ring-primary/30",
            )}
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

          <div className="min-w-75 flex-1 space-y-1.5">
            <WeekField
              imageWeek={item.imageWeek}
              briefWeek={briefWeek}
              imageId={item.imageId}
              exportPosition={item.exportPosition}
              onChange={(imageWeek) => onUpdate({ imageWeek })}
            />

            <Textarea
              placeholder="Label (minuscules, Enter = saut de ligne)"
              value={item.label}
              onChange={(e) => onUpdate({ label: e.target.value })}
              rows={2}
              className="min-h-14 resize-none text-sm"
            />

            <div className="flex items-center gap-2">
              <LinkFields
                linkType={item.linkType}
                cgid={item.cgid}
                cid={item.cid}
                link={item.link}
                onChange={onUpdate}
                cgidPlaceholder="ex: outlet, collection-t-shirts"
                cidPlaceholder="ex: aide-faq, content-page-id"
                selectClassName="h-8 w-28 shrink-0 text-xs"
                inputClassName="h-8 text-sm"
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
        </div>

        <div className="flex flex-col items-center gap-1.5 pt-1">
          <Switch
            checked={item.visible}
            onCheckedChange={(checked) => onUpdate({ visible: checked })}
            className="scale-75"
          />
          <span className="text-[9px] text-muted-foreground/50">
            {item.visible ? "ON" : "OFF"}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="mt-1 h-6 w-6 text-muted-foreground/40 hover:text-destructive"
            onClick={() => setConfirmDeleteOpen(true)}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>

      <ConfirmDeleteDialog
        open={confirmDeleteOpen}
        onOpenChange={setConfirmDeleteOpen}
        title="Supprimer ce macaron ?"
        description="Cette action est irréversible. Le macaron sera définitivement supprimé."
        onConfirm={onRemove}
      />
    </>
  );
}
