"use client";

import { Image as ImageIcon, Plus, TriangleAlert, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  const buttons: MeaButton[] = card.buttons ?? [createEmptyButton()];

  const updateButton = (index: number, updates: Partial<MeaButton>) => {
    onUpdate({ buttons: buttons.map((btn, i) => (i === index ? { ...btn, ...updates } : btn)) });
  };
  const addButton = () => onUpdate({ buttons: [...buttons, createEmptyButton()] });
  const removeButton = (index: number) => {
    if (buttons.length <= 1) return;
    onUpdate({ buttons: buttons.filter((_, i) => i !== index) });
  };

  return (
    <div className="flex flex-wrap items-start gap-3 rounded-lg border border-border/60 bg-card p-3">
      <div className="flex w-[150px] shrink-0 flex-col items-center gap-1.5">
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

      <div className="min-w-[320px] flex-1 space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-muted-foreground/70 shrink-0">
            Semaine
          </span>
          <Input
            type="number"
            placeholder="Semaine"
            value={card.imageWeek ?? briefWeek}
            onChange={(e) =>
              onUpdate({ imageWeek: e.target.value ? Number(e.target.value) : null })
            }
            min={1}
            max={53}
            className="h-8 w-28 text-sm"
          />
          {card.imageWeek != null && card.imageWeek !== briefWeek && (
            <span title="La semaine est différente de celle du brief">
              <TriangleAlert className="h-4 w-4 shrink-0 text-amber-500" />
            </span>
          )}
          <span
            className="text-[10px] text-muted-foreground/50 truncate"
            title={card.imageId}
          >
            ID: {card.imageId}
          </span>
        </div>

        <Input
          placeholder="Titre"
          value={card.title}
          onChange={(e) => onUpdate({ title: e.target.value })}
          className="h-9 text-sm font-semibold"
        />

        <div className="flex items-center gap-2 rounded-md bg-muted/40 p-1.5">
          <span className="text-[10px] text-muted-foreground shrink-0" title="Lien de toute la carte, indépendant des boutons">
            Lien carte
          </span>
          <Select
            value={card.linkType}
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
          {card.linkType === "cgid" ? (
            <Input
              placeholder="ex: outlet"
              value={card.cgid}
              onChange={(e) => onUpdate({ cgid: e.target.value })}
              className="h-7 text-xs flex-1"
            />
          ) : card.linkType === "cid" ? (
            <Input
              placeholder="ex: aide-faq"
              value={card.cid}
              onChange={(e) => onUpdate({ cid: e.target.value })}
              className="h-7 text-xs flex-1"
            />
          ) : (
            <Input
              placeholder="https://..."
              value={card.link}
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
                  placeholder="ex: outlet"
                  value={btn.cgid}
                  onChange={(e) => updateButton(idx, { cgid: e.target.value })}
                  className="h-7 text-xs flex-1"
                />
              ) : btn.linkType === "cid" ? (
                <Input
                  placeholder="ex: aide-faq"
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
