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
import type { CarouselButton, CarouselProductCallout, CarouselSlide } from "@/types";
import { cn } from "@/lib/utils";
import { createEmptyCarouselButton } from "./schema";
import { useFileDrop } from "@/lib/use-file-drop";

interface CarouselSlideEditorProps {
  slide: CarouselSlide;
  label: string;
  briefWeek: number;
  onUpdate: (updates: Partial<CarouselSlide>) => void;
  onOpenMediaLibrary: () => void;
  onDropFile?: (file: File) => void;
  onOpenTitleImageLibrary: () => void;
  onDropTitleFile?: (file: File) => void;
  onOpenVideoUpload: () => void;
}

function LinkFields({
  linkType,
  cgid,
  cid,
  link,
  onChange,
}: {
  linkType: "cgid" | "url" | "cid";
  cgid: string;
  cid: string;
  link: string;
  onChange: (updates: { linkType?: "cgid" | "url" | "cid"; cgid?: string; cid?: string; link?: string }) => void;
}) {
  return (
    <>
      <Select
        value={linkType}
        items={{ cgid: "cgid", cid: "cid", url: "URL" }}
        onValueChange={(v) => v && onChange({ linkType: v as "cgid" | "url" | "cid" })}
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
      {linkType === "cgid" ? (
        <Input placeholder="ex: soldes" value={cgid} onChange={(e) => onChange({ cgid: e.target.value })} className="h-7 text-xs flex-1" />
      ) : linkType === "cid" ? (
        <Input placeholder="ex: landing-x" value={cid} onChange={(e) => onChange({ cid: e.target.value })} className="h-7 text-xs flex-1" />
      ) : (
        <Input placeholder="https://..." value={link} onChange={(e) => onChange({ link: e.target.value })} className="h-7 text-xs flex-1" />
      )}
    </>
  );
}

export function CarouselSlideEditor({
  slide,
  label,
  briefWeek,
  onUpdate,
  onOpenMediaLibrary,
  onDropFile,
  onOpenTitleImageLibrary,
  onDropTitleFile,
  onOpenVideoUpload,
}: CarouselSlideEditorProps) {
  const { isDraggingOver, dropHandlers } = useFileDrop((file) => onDropFile?.(file));
  const { isDraggingOver: isDraggingOverTitle, dropHandlers: titleDropHandlers } = useFileDrop(
    (file) => onDropTitleFile?.(file),
  );
  const buttons: CarouselButton[] = slide.buttons ?? [];
  const updateButton = (index: number, updates: Partial<CarouselButton>) => {
    onUpdate({ buttons: buttons.map((b, i) => (i === index ? { ...b, ...updates } : b)) });
  };
  const addButton = () => onUpdate({ buttons: [...buttons, createEmptyCarouselButton()] });
  const removeButton = (index: number) => onUpdate({ buttons: buttons.filter((_, i) => i !== index) });

  const callout = slide.productCallout;

  return (
    <div className="space-y-3 rounded-lg border border-border/60 bg-card p-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-muted-foreground">{label}</span>
      </div>

      {/* Fond : image ou vidéo */}
      <div className="flex items-start gap-3">
        <div className="flex w-37.5 shrink-0 flex-col items-center gap-1.5">
          <Select
            value={slide.mediaType}
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
            style={{ width: 150, height: 90 }}
            title={slide.mediaType === "video" ? "Vignette (poster) de la vidéo" : "Fond"}
          >
            {slide.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={slide.imageUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <ImageIcon className="h-6 w-6 text-muted-foreground/40" />
            )}
          </button>
          <span className="text-[9px] text-muted-foreground/60">
            {slide.mediaType === "video" ? "Vignette (poster)" : "Fond"}
          </span>

          {slide.mediaType === "video" && (
            <div
              className={cn(
                "flex w-full flex-col items-center gap-1.5 rounded-md border p-1.5",
                slide.videoUrl ? "border-emerald-300 bg-emerald-50" : "border-dashed",
              )}
            >
              {slide.videoUrl ? (
                <>
                  <video src={slide.videoUrl} muted className="h-14 w-full rounded object-cover" />
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
              <button type="button" onClick={onOpenVideoUpload} className="text-[10px] text-primary hover:underline">
                {slide.videoUrl ? "Remplacer la vidéo" : "Uploader une vidéo"}
              </button>
            </div>
          )}

          <div className="flex items-center gap-1.5">
            <Switch
              checked={slide.darkOverlay}
              onCheckedChange={(c) => onUpdate({ darkOverlay: c })}
              className="scale-75"
            />
            <span className="text-[9px] text-muted-foreground">Voile sombre</span>
          </div>
        </div>

        <div className="min-w-[320px] flex-1 space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-muted-foreground/70 shrink-0">
              Semaine
            </span>
            <Input
              type="number"
              placeholder="Semaine"
              value={slide.imageWeek ?? briefWeek}
              onChange={(e) => onUpdate({ imageWeek: e.target.value ? Number(e.target.value) : null })}
              min={1}
              max={53}
              className="h-8 w-28 text-sm"
            />
            {slide.imageWeek != null && slide.imageWeek !== briefWeek && (
              <span title="La semaine est différente de celle du brief">
                <TriangleAlert className="h-4 w-4 shrink-0 text-amber-500" />
              </span>
            )}
            <span
              className="text-[10px] text-muted-foreground/50 truncate"
              title={slide.imageId}
            >
              ID: {slide.imageId}
            </span>
          </div>

          {/* Titre : texte ou image */}
          <div className="flex items-center gap-2 rounded-md bg-muted/40 p-1.5">
            <Select
              value={slide.titleType}
              items={{ image: "Titre image", text: "Titre texte" }}
              onValueChange={(v) => v && onUpdate({ titleType: v as "image" | "text" })}
            >
              <SelectTrigger className="h-7 w-32 shrink-0 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="image">Titre image</SelectItem>
                <SelectItem value="text">Titre texte</SelectItem>
              </SelectContent>
            </Select>
            {slide.titleType === "text" ? (
              <Textarea
                placeholder="Titre (Entrée = saut de ligne)"
                value={slide.titleText}
                onChange={(e) => onUpdate({ titleText: e.target.value })}
                rows={1}
                className="h-8 min-h-8 flex-1 resize-none text-sm bg-white"
              />
            ) : (
              <button
                type="button"
                onClick={onOpenTitleImageLibrary}
                {...titleDropHandlers}
                className={cn(
                  "flex h-8 items-center justify-center overflow-hidden rounded border border-dashed border-muted-foreground/20 bg-white px-3 text-xs text-muted-foreground transition-all hover:border-primary/40 hover:bg-primary/5",
                  isDraggingOverTitle && "border-primary bg-primary/10 ring-2 ring-primary/30",
                )}
              >
                {slide.titleImageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={slide.titleImageUrl} alt="" className="h-6 max-w-24 object-contain" />
                ) : (
                  "Choisir une image de titre"
                )}
              </button>
            )}
          </div>

          {/* Lien fantôme (toute la diapo) */}
          <div className="flex items-center gap-2 rounded-md bg-muted/40 p-1.5">
            <span
              className="text-[10px] text-muted-foreground shrink-0"
              title="Lien de toute la diapositive, indépendant des boutons"
            >
              Lien diapo
            </span>
            <LinkFields
              linkType={slide.linkType}
              cgid={slide.cgid}
              cid={slide.cid}
              link={slide.link}
              onChange={onUpdate}
            />
          </div>

          {/* Alignement de la diapositive (data-align) — indépendant du
              callout produit : s'applique même s'il est désactivé. */}
          <div className="flex items-center gap-2 rounded-md bg-muted/40 p-1.5">
            <span
              className="text-[10px] text-muted-foreground shrink-0"
              title="Position du contenu (attribut data-align)"
            >
              Alignement
            </span>
            <Select
              value={callout.side}
              items={{ left: "Gauche", right: "Droite", center: "Centre", "only-center": "Centre seul" }}
              onValueChange={(v) =>
                v && onUpdate({ productCallout: { ...callout, side: v as CarouselProductCallout["side"] } })
              }
            >
              <SelectTrigger className="h-7 w-28 shrink-0 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="left">Gauche</SelectItem>
                <SelectItem value="right">Droite</SelectItem>
                <SelectItem value="center">Centre</SelectItem>
                <SelectItem value="only-center">Centre seul</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Callout produit (optionnel) */}
          <div className="space-y-1.5 rounded-md bg-muted/40 p-1.5">
            <div className="flex items-center gap-1.5">
              <Switch
                checked={callout.enabled}
                onCheckedChange={(c) => onUpdate({ productCallout: { ...callout, enabled: c } })}
                className="scale-75"
              />
              <span className="text-[10px] text-muted-foreground">Callout produit (prix)</span>
            </div>
            {callout.enabled && (
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-1.5">
                  <Input
                    placeholder="Libellé (ex: Ensemble)"
                    value={callout.label}
                    onChange={(e) => onUpdate({ productCallout: { ...callout, label: e.target.value } })}
                    className="h-7 flex-1 text-xs"
                  />
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <Input
                    placeholder="Prix public"
                    value={callout.publicPrice}
                    onChange={(e) => onUpdate({ productCallout: { ...callout, publicPrice: e.target.value } })}
                    className="h-7 w-28 text-xs"
                  />
                  <Input
                    placeholder="Prix club"
                    value={callout.clubPrice}
                    onChange={(e) => onUpdate({ productCallout: { ...callout, clubPrice: e.target.value } })}
                    className="h-7 w-28 text-xs"
                  />
                  <div className="flex items-center gap-1">
                    <Switch
                      checked={callout.showClubIcon}
                      onCheckedChange={(c) => onUpdate({ productCallout: { ...callout, showClubIcon: c } })}
                      className="scale-75"
                    />
                    <span className="text-[9px] text-muted-foreground">icône club</span>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <div className="flex items-center gap-1">
                    <Switch
                      checked={callout.showBrandLogo}
                      onCheckedChange={(c) => onUpdate({ productCallout: { ...callout, showBrandLogo: c } })}
                      className="scale-75"
                    />
                    <span className="text-[9px] text-muted-foreground">logo marque</span>
                  </div>
                  {callout.showBrandLogo && (
                    <Input
                      placeholder="svg/marque.svg"
                      value={callout.brandLogoPath}
                      onChange={(e) => onUpdate({ productCallout: { ...callout, brandLogoPath: e.target.value } })}
                      className="h-6 w-32 text-[10px]"
                    />
                  )}
                  <div className="flex items-center gap-1">
                    <Switch
                      checked={callout.showPromoBadge}
                      onCheckedChange={(c) => onUpdate({ productCallout: { ...callout, showPromoBadge: c } })}
                      className="scale-75"
                    />
                    <span className="text-[9px] text-muted-foreground">badge promo</span>
                  </div>
                  {callout.showPromoBadge && (
                    <Input
                      placeholder="Promo Club*"
                      value={callout.promoBadgeText}
                      onChange={(e) => onUpdate({ productCallout: { ...callout, promoBadgeText: e.target.value } })}
                      className="h-6 w-28 text-[10px]"
                    />
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Boutons */}
          <div className="space-y-1.5 pt-1 border-t">
            {buttons.map((btn, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <Input
                  placeholder={`Bouton ${idx + 1}`}
                  value={btn.text}
                  onChange={(e) => updateButton(idx, { text: e.target.value })}
                  className="h-7 w-24 text-xs shrink-0"
                />
                <LinkFields
                  linkType={btn.linkType}
                  cgid={btn.cgid}
                  cid={btn.cid}
                  link={btn.link}
                  onChange={(updates) => updateButton(idx, updates)}
                />
                <button
                  type="button"
                  onClick={() => removeButton(idx)}
                  className="text-muted-foreground/40 hover:text-destructive transition-colors p-0.5"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
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
              value={slide.comment ?? ""}
              onChange={(e) => onUpdate({ comment: e.target.value })}
              rows={2}
              className={cn(
                "min-h-10 resize-none text-sm",
                (slide.comment ?? "").trim()
                  ? "border-red-500 border-l-[3px]! border-l-red-500! focus-visible:ring-2 focus-visible:ring-red-500/40"
                  : "",
              )}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
