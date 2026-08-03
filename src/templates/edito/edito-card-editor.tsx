"use client";

import { useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Trash2, Image as ImageIcon } from "lucide-react";
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
import { ButtonsEditor } from "@/components/editor/buttons-editor";
import { ConfirmDeleteDialog } from "@/components/editor/confirm-delete-dialog";
import { LinkFields } from "@/components/editor/link-fields";
import { WeekField } from "@/components/editor/week-field";
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

  // Anciennes données sans champ buttons
  const buttons: MeaButton[] = item.buttons ?? [createEmptyButton()];

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

          <div className="min-w-80 flex-1 space-y-2">
            <WeekField
              imageWeek={item.imageWeek}
              briefWeek={briefWeek}
              imageId={item.imageId}
              exportPosition={item.exportPosition}
              onChange={(imageWeek) => onUpdate({ imageWeek })}
            />

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
              <span
                className="text-[10px] text-muted-foreground shrink-0"
                title="Lien de l'image, indépendant des boutons"
              >
                Lien image
              </span>
              <LinkFields
                linkType={item.linkType}
                cgid={item.cgid}
                cid={item.cid}
                link={item.link}
                onChange={onUpdate}
                cgidPlaceholder="ex: jouets-0-2"
                cidPlaceholder="ex: landing-tamboor"
              />
            </div>

            <ButtonsEditor
              buttons={buttons}
              onChange={(next) => onUpdate({ buttons: next })}
              cgidPlaceholder="ex: jouets-0-2"
              cidPlaceholder="ex: landing-tamboor"
            />

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
        title="Supprimer cette carte edito ?"
        description="Cette action est irréversible. La carte sera définitivement supprimée."
        onConfirm={onRemove}
      />
    </>
  );
}
