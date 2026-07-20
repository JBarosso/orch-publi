"use client";

import { CheckCircle2, Image as ImageIcon, Plus, TriangleAlert, Video, X } from "lucide-react";
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
import type { MeaV2FocusCard, MeaButton } from "@/types";
import { cn } from "@/lib/utils";
import { createEmptyButton } from "./schema";

interface MeaV2FocusEditorProps {
  focus: MeaV2FocusCard;
  briefWeek: number;
  onUpdate: (updates: Partial<MeaV2FocusCard>) => void;
  onOpenMediaLibrary: () => void;
  onOpenVideoUpload: () => void;
}

export function MeaV2FocusEditor({
  focus,
  briefWeek,
  onUpdate,
  onOpenMediaLibrary,
  onOpenVideoUpload,
}: MeaV2FocusEditorProps) {
  const buttons: MeaButton[] = focus.buttons ?? [createEmptyButton()];

  const updateButton = (index: number, updates: Partial<MeaButton>) => {
    onUpdate({ buttons: buttons.map((btn, i) => (i === index ? { ...btn, ...updates } : btn)) });
  };
  const addButton = () => onUpdate({ buttons: [...buttons, createEmptyButton()] });
  const removeButton = (index: number) => {
    if (buttons.length <= 1) return;
    onUpdate({ buttons: buttons.filter((_, i) => i !== index) });
  };

  const appelPrix = focus.appelPrix;

  return (
    <div className="flex items-start gap-3 rounded-lg border border-border/60 bg-card p-3">
      <div className="flex w-[150px] shrink-0 flex-col items-center gap-1.5">
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
          className="flex items-center justify-center overflow-hidden border-2 border-dashed border-muted-foreground/20 bg-white transition-all hover:border-primary/40 hover:bg-primary/5"
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

      <div className="min-w-[320px] flex-1 space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-muted-foreground/70 shrink-0">
            Semaine
          </span>
          <Input
            type="number"
            placeholder="Semaine"
            value={focus.imageWeek ?? briefWeek}
            onChange={(e) =>
              onUpdate({ imageWeek: e.target.value ? Number(e.target.value) : null })
            }
            min={1}
            max={53}
            className="h-8 w-28 text-sm"
          />
          {focus.imageWeek != null && focus.imageWeek !== briefWeek && (
            <span title="La semaine est différente de celle du brief">
              <TriangleAlert className="h-4 w-4 shrink-0 text-amber-500" />
            </span>
          )}
          <span
            className="text-[10px] text-muted-foreground/50 truncate"
            title={focus.imageId}
          >
            ID: {focus.imageId}
          </span>
        </div>

        <Input
          placeholder="Titre"
          value={focus.title}
          onChange={(e) => onUpdate({ title: e.target.value })}
          className="h-9 text-sm font-semibold"
        />

        <div className="flex items-center gap-2 rounded-md bg-muted/40 p-1.5">
          <span className="text-[10px] text-muted-foreground shrink-0" title="Lien de toute la carte, indépendant des boutons">
            Lien carte
          </span>
          <Select
            value={focus.linkType}
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
          {focus.linkType === "cgid" ? (
            <Input
              placeholder="ex: outlet"
              value={focus.cgid}
              onChange={(e) => onUpdate({ cgid: e.target.value })}
              className="h-7 text-xs flex-1"
            />
          ) : focus.linkType === "cid" ? (
            <Input
              placeholder="ex: aide-faq"
              value={focus.cid}
              onChange={(e) => onUpdate({ cid: e.target.value })}
              className="h-7 text-xs flex-1"
            />
          ) : (
            <Input
              placeholder="https://..."
              value={focus.link}
              onChange={(e) => onUpdate({ link: e.target.value })}
              className="h-7 text-xs flex-1"
            />
          )}
        </div>

        {/* Badge prix (appelPrix) */}
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
