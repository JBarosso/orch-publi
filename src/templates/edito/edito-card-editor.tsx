"use client";

import { useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Plus, Trash2, Image as ImageIcon, TriangleAlert, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import type { EditoCard, MeaButton } from "@/types";
import { EDITO_THEMES } from "@/types";
import { cn } from "@/lib/utils";
import { createEmptyButton } from "@/templates/mea/schema";
import { useFileDrop } from "@/lib/use-file-drop";

interface EditoCardEditorProps {
  item: EditoCard;
  isActive: boolean;
  briefWeek: number;
  onUpdate: (updates: Partial<EditoCard>) => void;
  onRemove: () => void;
  onOpenMediaLibrary: () => void;
  onDropFile?: (file: File) => void;
}

export function EditoCardEditor({
  item,
  isActive,
  briefWeek,
  onUpdate,
  onRemove,
  onOpenMediaLibrary,
  onDropFile,
}: EditoCardEditorProps) {
  const { isDraggingOver, dropHandlers } = useFileDrop((file) => onDropFile?.(file));
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
  });

  const buttons: MeaButton[] = item.buttons ?? [createEmptyButton()];
  const updateButton = (index: number, updates: Partial<MeaButton>) => {
    onUpdate({ buttons: buttons.map((btn, i) => (i === index ? { ...btn, ...updates } : btn)) });
  };
  const addButton = () => onUpdate({ buttons: [...buttons, createEmptyButton()] });
  const removeButton = (index: number) => {
    if (buttons.length <= 1) return;
    onUpdate({ buttons: buttons.filter((_, i) => i !== index) });
  };

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

        <div className="flex w-37.5 shrink-0 flex-col items-center gap-1.5">
          <button
            type="button"
            onClick={onOpenMediaLibrary}
            {...dropHandlers}
            className={cn(
              "flex items-center justify-center overflow-hidden border-2 border-dashed border-muted-foreground/20 bg-white transition-all hover:border-primary/40 hover:bg-primary/5",
              isDraggingOver && "border-primary bg-primary/10 ring-2 ring-primary/30",
            )}
            style={{ width: 150, height: 85 }}
          >
            {item.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={item.imageUrl} alt={item.title} className="h-full w-full object-cover" />
            ) : (
              <ImageIcon className="h-6 w-6 text-muted-foreground/40" />
            )}
          </button>
          <Select
            value={item.theme}
            items={EDITO_THEMES}
            onValueChange={(v) => v && onUpdate({ theme: v as EditoCard["theme"] })}
          >
            <SelectTrigger className="h-7 w-full text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {EDITO_THEMES.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="min-w-[320px] flex-1 space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-muted-foreground/70 shrink-0">Semaine</span>
            <Input
              type="number"
              placeholder="Semaine"
              value={item.imageWeek ?? briefWeek}
              onChange={(e) =>
                onUpdate({ imageWeek: e.target.value ? Number(e.target.value) : null })
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
            <span className="text-[10px] text-muted-foreground/50 truncate" title={item.imageId}>
              ID: {item.imageId}
            </span>
          </div>

          <Input
            placeholder="Titre"
            value={item.title}
            onChange={(e) => onUpdate({ title: e.target.value })}
            className="h-9 text-sm font-semibold"
          />

          <Textarea
            placeholder="Texte (optionnel)"
            value={item.text}
            onChange={(e) => onUpdate({ text: e.target.value })}
            rows={2}
            className="min-h-14 resize-none text-sm"
          />

          <div className="flex items-center gap-2 rounded-md bg-muted/40 p-1.5">
            <span className="text-[10px] text-muted-foreground shrink-0" title="Lien de l'image, indépendant des boutons">
              Lien image
            </span>
            <Select
              value={item.linkType}
              items={{ cgid: "cgid", cid: "cid", url: "URL" }}
              onValueChange={(v) => v && onUpdate({ linkType: v as "cgid" | "url" | "cid" })}
            >
              <SelectTrigger className="h-7 w-20 shrink-0 text-xs">
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
                placeholder="ex: jouets-0-2"
                value={item.cgid}
                onChange={(e) => onUpdate({ cgid: e.target.value })}
                className="h-7 text-xs flex-1"
              />
            ) : item.linkType === "cid" ? (
              <Input
                placeholder="ex: landing-tamboor"
                value={item.cid}
                onChange={(e) => onUpdate({ cid: e.target.value })}
                className="h-7 text-xs flex-1"
              />
            ) : (
              <Input
                placeholder="https://..."
                value={item.link}
                onChange={(e) => onUpdate({ link: e.target.value })}
                className="h-7 text-xs flex-1"
              />
            )}
          </div>

          <div className="space-y-1.5 pt-1 border-t">
            {buttons.map((btn, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <Input
                  placeholder={`Bouton ${idx + 1}`}
                  value={btn.text}
                  onChange={(e) => updateButton(idx, { text: e.target.value })}
                  className="h-7 w-24 text-xs shrink-0"
                />
                <Select
                  value={btn.linkType}
                  items={{ cgid: "cgid", cid: "cid", url: "URL" }}
                  onValueChange={(v) => v && updateButton(idx, { linkType: v as "cgid" | "url" | "cid" })}
                >
                  <SelectTrigger className="h-7 w-20 shrink-0 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cgid">cgid</SelectItem>
                    <SelectItem value="cid">cid</SelectItem>
                    <SelectItem value="url">URL</SelectItem>
                  </SelectContent>
                </Select>
                {btn.linkType === "cgid" ? (
                  <Input
                    placeholder="ex: jouets-0-2"
                    value={btn.cgid}
                    onChange={(e) => updateButton(idx, { cgid: e.target.value })}
                    className="h-7 text-xs flex-1"
                  />
                ) : btn.linkType === "cid" ? (
                  <Input
                    placeholder="ex: landing-tamboor"
                    value={btn.cid}
                    onChange={(e) => updateButton(idx, { cid: e.target.value })}
                    className="h-7 text-xs flex-1"
                  />
                ) : (
                  <Input
                    placeholder="https://..."
                    value={btn.link}
                    onChange={(e) => updateButton(idx, { link: e.target.value })}
                    className="h-7 text-xs flex-1"
                  />
                )}
                {buttons.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeButton(idx)}
                    className="text-muted-foreground/40 hover:text-destructive transition-colors p-0.5"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={addButton}
              className="flex items-center gap-1 text-xs text-muted-foreground/60 hover:text-primary transition-colors"
            >
              <Plus className="h-3 w-3" />
              <span>Ajouter un bouton</span>
            </button>
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
            <DialogTitle>Supprimer cette carte edito ?</DialogTitle>
            <DialogDescription>
              Cette action est irreversible. La carte sera définitivement supprimée.
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
