"use client";

import { useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  GripVertical,
  Trash2,
  Image as ImageIcon,
  TriangleAlert,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { ImgSousMenuItem } from "@/types";
import { cn } from "@/lib/utils";
import { useFileDrop } from "@/lib/use-file-drop";

interface ImgSousMenuItemEditorProps {
  item: ImgSousMenuItem;
  isActive: boolean;
  briefWeek: number;
  onUpdate: (updates: Partial<ImgSousMenuItem>) => void;
  onRemove: () => void;
  onOpenMediaLibrary: () => void;
  onDropFile?: (file: File) => void;
}

export function ImgSousMenuItemEditor({
  item,
  isActive,
  briefWeek,
  onUpdate,
  onRemove,
  onOpenMediaLibrary,
  onDropFile,
}: ImgSousMenuItemEditorProps) {
  const { isDraggingOver, dropHandlers } = useFileDrop((file) =>
    onDropFile?.(file),
  );
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
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
          <button
            type="button"
            onClick={onOpenMediaLibrary}
            {...dropHandlers}
            className={cn(
              "shrink-0 flex items-center justify-center overflow-hidden rounded border-2 border-dashed border-muted-foreground/20 bg-muted transition-all hover:border-primary/40 hover:bg-primary/5",
              isDraggingOver &&
                "border-primary bg-primary/10 ring-2 ring-primary/30",
            )}
            style={{ width: 280, height: 64 }}
            title="563×125 px"
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
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-muted-foreground/70 shrink-0">
                Semaine
              </span>
              <Input
                type="number"
                placeholder="Semaine"
                value={item.imageWeek ?? briefWeek}
                onChange={(e) =>
                  onUpdate({
                    imageWeek: e.target.value ? Number(e.target.value) : null,
                  })
                }
                min={1}
                max={53}
                className="h-8 w-28 text-sm"
              />
              {item.imageWeek != null && item.imageWeek !== briefWeek && (
                <span
                  title={
                    item.exportPosition != null
                      ? `Semaine différente de celle du brief — position figée à ${item.exportPosition}`
                      : "La semaine est différente de celle du brief"
                  }
                  className="flex items-center gap-0.5"
                >
                  <TriangleAlert className="h-4 w-4 shrink-0 text-amber-500" />
                  {item.exportPosition != null && (
                    <span className="text-[9px] font-medium text-amber-600">
                      #{item.exportPosition} figé
                    </span>
                  )}
                </span>
              )}
              <span
                className="text-[10px] text-muted-foreground/50 truncate"
                title={item.imageId}
              >
                ID: {item.imageId}
              </span>
            </div>

            <Input
              placeholder="Label (informatif, non exporté)"
              value={item.label}
              onChange={(e) => onUpdate({ label: e.target.value })}
              className="h-8 text-sm"
            />

            <div className="flex items-center gap-2">
              <Select
                value={item.linkType}
                items={{ cgid: "cgid", cid: "cid", url: "URL" }}
                onValueChange={(v) =>
                  v && onUpdate({ linkType: v as "cgid" | "url" | "cid" })
                }
              >
                <SelectTrigger className="h-8 w-28 shrink-0 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cgid">cgid</SelectItem>
                  <SelectItem value="cid">cid</SelectItem>
                  <SelectItem value="url">URL</SelectItem>
                </SelectContent>
              </Select>

              {item.linkType === "cgid" ? (
                <Input
                  placeholder="ex: outlet, collection-t-shirts"
                  value={item.cgid}
                  onChange={(e) => onUpdate({ cgid: e.target.value })}
                  className="h-8 text-sm"
                />
              ) : item.linkType === "cid" ? (
                <Input
                  placeholder="ex: aide-faq, content-page-id"
                  value={item.cid}
                  onChange={(e) => onUpdate({ cid: e.target.value })}
                  className="h-8 text-sm"
                />
              ) : (
                <Input
                  placeholder="https://..."
                  value={item.link}
                  onChange={(e) => onUpdate({ link: e.target.value })}
                  className="h-8 text-sm"
                />
              )}
            </div>
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

      <Dialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Supprimer cette image ?</DialogTitle>
            <DialogDescription>
              Cette action est irreversible. L&apos;image sera définitivement
              supprimée.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:flex-wrap">
            <Button
              variant="outline"
              onClick={() => setConfirmDeleteOpen(false)}
            >
              Annuler
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                setConfirmDeleteOpen(false);
                onRemove();
              }}
            >
              Supprimer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
