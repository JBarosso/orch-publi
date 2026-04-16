"use client";

import { useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Trash2, Image as ImageIcon, TriangleAlert } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
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
import type { MacaronItem } from "@/types";
import { sanitizeMacaronLabel } from "./schema";
import { cn } from "@/lib/utils";

interface MacaronItemEditorProps {
  item: MacaronItem;
  isActive: boolean;
  briefWeek: number;
  onUpdate: (updates: Partial<MacaronItem>) => void;
  onRemove: () => void;
  onOpenMediaLibrary: () => void;
}

export function MacaronItemEditor({
  item,
  isActive,
  briefWeek,
  onUpdate,
  onRemove,
  onOpenMediaLibrary,
}: MacaronItemEditorProps) {
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

        <button
          type="button"
          onClick={onOpenMediaLibrary}
          className="shrink-0 flex h-[70px] w-[70px] items-center justify-center overflow-hidden rounded-full border-2 border-dashed border-muted-foreground/20 bg-muted transition-all hover:border-primary/40 hover:bg-primary/5"
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

        <div className="flex-1 space-y-1.5">
          <div className="flex items-start gap-2">
            <Textarea
              placeholder="Label (minuscules, Enter = saut de ligne)"
              value={item.label}
              onChange={(e) =>
                onUpdate({ label: sanitizeMacaronLabel(e.target.value) })
              }
              rows={2}
              className="min-h-14 resize-none text-sm"
            />
          </div>

          <div className="flex items-center gap-2">
            <Select
              value={item.linkType}
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

          <div className="flex items-center gap-2">
            <Input
              type="number"
              placeholder="Semaine du macaron"
              value={item.imageWeek ?? briefWeek}
              onChange={(e) =>
                onUpdate({
                  imageWeek: e.target.value ? Number(e.target.value) : null,
                })
              }
              min={1}
              max={53}
              className="h-8 w-56 text-sm"
            />
            {item.imageWeek != null && item.imageWeek !== briefWeek && (
              <span title="La semaine est différente de celle du brief">
                <TriangleAlert className="h-4 w-4 shrink-0 text-amber-500" />
              </span>
            )}
            <span className="text-[10px] text-muted-foreground/50 truncate" title={item.imageId}>
              ID: {item.imageId}
            </span>
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

      <Dialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Supprimer ce macaron ?</DialogTitle>
            <DialogDescription>
              Cette action est irreversible. Le macaron sera définitivement supprimé.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:flex-wrap">
            <Button variant="outline" onClick={() => setConfirmDeleteOpen(false)}>
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
