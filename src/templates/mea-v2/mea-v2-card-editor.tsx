"use client";

import { Image as ImageIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ButtonsEditor } from "@/components/editor/buttons-editor";
import { LinkFields } from "@/components/editor/link-fields";
import { WeekField } from "@/components/editor/week-field";
import type { MeaV2Card, MeaButton } from "@/types";
import { cn } from "@/lib/utils";
import { createEmptyButton } from "./schema";
import { useFileDrop } from "@/lib/use-file-drop";

interface MeaV2CardEditorProps {
  card: MeaV2Card;
  label: string;
  briefWeek: number;
  onUpdate: (updates: Partial<MeaV2Card>) => void;
  onOpenMediaLibrary: () => void;
  onDropFile?: (file: File) => void;
}

export function MeaV2CardEditor({
  card,
  label,
  briefWeek,
  onUpdate,
  onOpenMediaLibrary,
  onDropFile,
}: MeaV2CardEditorProps) {
  const { isDraggingOver, dropHandlers } = useFileDrop((file) => onDropFile?.(file));
  // Anciennes données sans champ buttons
  const buttons: MeaButton[] = card.buttons ?? [createEmptyButton()];

  return (
    <div className="flex flex-wrap items-start gap-3 rounded-lg border border-border/60 bg-card p-3">
      <div className="flex w-37.5 shrink-0 flex-col items-center gap-1.5">
        <span className="text-[10px] font-medium text-muted-foreground">{label}</span>
        <button
          type="button"
          onClick={onOpenMediaLibrary}
          {...dropHandlers}
          className={cn(
            "flex items-center justify-center overflow-hidden border-2 border-dashed border-muted-foreground/20 bg-white transition-all hover:border-primary/40 hover:bg-primary/5",
            isDraggingOver && "border-primary bg-primary/10 ring-2 ring-primary/30",
          )}
          style={{ width: 150, height: 125 }}
        >
          {card.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={card.imageUrl} alt={card.title} className="h-full w-full object-cover" />
          ) : (
            <ImageIcon className="h-6 w-6 text-muted-foreground/40" />
          )}
        </button>
      </div>

      <div className="min-w-80 flex-1 space-y-2">
        <WeekField
          imageWeek={card.imageWeek}
          briefWeek={briefWeek}
          imageId={card.imageId}
          onChange={(imageWeek) => onUpdate({ imageWeek })}
        />

        <Input
          placeholder="Titre"
          value={card.title}
          onChange={(e) => onUpdate({ title: e.target.value })}
          className="h-9 text-sm font-semibold"
        />

        <div className="flex items-center gap-2 rounded-md bg-muted/40 p-1.5">
          <span
            className="text-[10px] text-muted-foreground shrink-0"
            title="Lien de toute la carte, indépendant des boutons"
          >
            Lien carte
          </span>
          <LinkFields
            linkType={card.linkType}
            cgid={card.cgid}
            cid={card.cid}
            link={card.link}
            onChange={onUpdate}
          />
        </div>

        <ButtonsEditor
          buttons={buttons}
          onChange={(next) => onUpdate({ buttons: next })}
        />

        <div className="space-y-1">
          <span className="text-[11px] text-muted-foreground">commentaire</span>
          <Textarea
            placeholder="commentaire..."
            value={card.comment ?? ""}
            onChange={(e) => onUpdate({ comment: e.target.value })}
            rows={2}
            className={cn(
              "min-h-10 resize-none text-sm",
              (card.comment ?? "").trim()
                ? "border-red-500 border-l-[3px]! border-l-red-500! focus-visible:ring-2 focus-visible:ring-red-500/40"
                : "",
            )}
          />
        </div>
      </div>
    </div>
  );
}
