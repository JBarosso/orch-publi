"use client";

import { CheckCircle2, Image as ImageIcon, Video } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ButtonsEditor } from "@/components/editor/buttons-editor";
import { LinkFields } from "@/components/editor/link-fields";
import { WeekField } from "@/components/editor/week-field";
import type { MeaV2FocusCard, MeaButton } from "@/types";
import { cn } from "@/lib/utils";
import { createEmptyButton } from "./schema";
import { useFileDrop } from "@/lib/use-file-drop";

interface MeaV2FocusEditorProps {
  focus: MeaV2FocusCard;
  briefWeek: number;
  onUpdate: (updates: Partial<MeaV2FocusCard>) => void;
  onOpenMediaLibrary: () => void;
  onDropFile?: (file: File) => void;
  onOpenVideoUpload: () => void;
}

export function MeaV2FocusEditor({
  focus,
  briefWeek,
  onUpdate,
  onOpenMediaLibrary,
  onDropFile,
  onOpenVideoUpload,
}: MeaV2FocusEditorProps) {
  const { isDraggingOver, dropHandlers } = useFileDrop((file) => onDropFile?.(file));
  // Anciennes données sans champ buttons
  const buttons: MeaButton[] = focus.buttons ?? [createEmptyButton()];

  const appelPrix = focus.appelPrix;

  return (
    <div className="flex flex-wrap items-start gap-3 rounded-lg border border-border/60 bg-card p-3">
      <div className="flex w-37.5 shrink-0 flex-col items-center gap-1.5">
        <span className="text-[10px] font-medium text-muted-foreground">Carte focus (5)</span>

        <Select
          value={focus.mediaType}
          items={{ image: "Image", video: "Vidéo" }}
          onValueChange={(v) => v && onUpdate({ mediaType: v as "image" | "video" })}
        >
          <SelectTrigger className="h-7 w-full text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="image">Image</SelectItem>
            <SelectItem value="video">Vidéo</SelectItem>
          </SelectContent>
        </Select>

        <button
          type="button"
          onClick={onOpenMediaLibrary}
          {...dropHandlers}
          className={cn(
            "flex items-center justify-center overflow-hidden border-2 border-dashed border-muted-foreground/20 bg-white transition-all hover:border-primary/40 hover:bg-primary/5",
            isDraggingOver && "border-primary bg-primary/10 ring-2 ring-primary/30",
          )}
          style={{ width: 150, height: 175 }}
          title={focus.mediaType === "video" ? "Vignette (poster) de la vidéo" : "Image"}
        >
          {focus.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={focus.imageUrl} alt={focus.title} className="h-full w-full object-cover" />
          ) : (
            <ImageIcon className="h-6 w-6 text-muted-foreground/40" />
          )}
        </button>
        <span className="text-[9px] text-muted-foreground/60">
          {focus.mediaType === "video" ? "Vignette (poster)" : "Image"}
        </span>

        {focus.mediaType === "video" && (
          <div
            className={cn(
              "flex w-full flex-col items-center gap-1.5 rounded-md border p-1.5",
              focus.videoUrl
                ? "border-emerald-300 bg-emerald-50"
                : "border-dashed",
            )}
          >
            {focus.videoUrl ? (
              <>
                <video
                  src={focus.videoUrl}
                  muted
                  className="h-16 w-full rounded object-cover"
                />
                <div className="flex items-center gap-1 text-[10px] font-medium text-emerald-700">
                  <CheckCircle2 className="h-3 w-3" />
                  Vidéo uploadée
                </div>
              </>
            ) : (
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <Video className="h-3 w-3" />
                Aucune vidéo
              </div>
            )}
            <button
              type="button"
              onClick={onOpenVideoUpload}
              className="text-[10px] text-primary hover:underline"
            >
              {focus.videoUrl ? "Remplacer la vidéo" : "Uploader une vidéo"}
            </button>
          </div>
        )}
      </div>

      <div className="min-w-80 flex-1 space-y-2">
        <WeekField
          imageWeek={focus.imageWeek}
          briefWeek={briefWeek}
          imageId={focus.imageId}
          onChange={(imageWeek) => onUpdate({ imageWeek })}
        />

        <Input
          placeholder="Titre"
          value={focus.title}
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
            linkType={focus.linkType}
            cgid={focus.cgid}
            cid={focus.cid}
            link={focus.link}
            onChange={onUpdate}
          />
        </div>

        <div className="space-y-1.5 rounded-md bg-muted/40 p-1.5">
          <div className="flex items-center gap-1.5">
            <Switch
              checked={appelPrix.enabled}
              onCheckedChange={(c) => onUpdate({ appelPrix: { ...appelPrix, enabled: c } })}
              className="scale-75"
            />
            <span className="text-[10px] text-muted-foreground">Badge prix (haut droite)</span>
          </div>
          {appelPrix.enabled && (
            <div className="flex flex-wrap items-center gap-1.5">
              <Input
                placeholder="Titre (ex: Dors-bien)"
                value={appelPrix.title}
                onChange={(e) => onUpdate({ appelPrix: { ...appelPrix, title: e.target.value } })}
                className="h-7 w-32 text-xs"
              />
              <Input
                placeholder="Prix initial"
                value={appelPrix.initialPrice}
                onChange={(e) => onUpdate({ appelPrix: { ...appelPrix, initialPrice: e.target.value } })}
                className="h-7 w-24 text-xs"
              />
              <Input
                placeholder="Prix club"
                value={appelPrix.clubPrice}
                onChange={(e) => onUpdate({ appelPrix: { ...appelPrix, clubPrice: e.target.value } })}
                className="h-7 w-24 text-xs"
              />
              <div className="flex items-center gap-1">
                <Switch
                  checked={appelPrix.showClubIcon}
                  onCheckedChange={(c) => onUpdate({ appelPrix: { ...appelPrix, showClubIcon: c } })}
                  className="scale-75"
                />
                <span className="text-[9px] text-muted-foreground">icône club</span>
              </div>
            </div>
          )}
        </div>

        <ButtonsEditor
          buttons={buttons}
          onChange={(next) => onUpdate({ buttons: next })}
        />

        <div className="space-y-1">
          <span className="text-[11px] text-muted-foreground">commentaire</span>
          <Textarea
            placeholder="commentaire..."
            value={focus.comment ?? ""}
            onChange={(e) => onUpdate({ comment: e.target.value })}
            rows={2}
            className={cn(
              "min-h-10 resize-none text-sm",
              (focus.comment ?? "").trim()
                ? "border-red-500 border-l-[3px]! border-l-red-500! focus-visible:ring-2 focus-visible:ring-red-500/40"
                : "",
            )}
          />
        </div>
      </div>
    </div>
  );
}
