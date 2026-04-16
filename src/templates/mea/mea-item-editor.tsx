"use client";

import { useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Trash2, Image as ImageIcon, TriangleAlert, Plus, X } from "lucide-react";
import { Input } from "@/components/ui/input";
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
import type { MeaItem, MeaOverlayType, MeaPricingMode, MeaButton } from "@/types";
import { cn } from "@/lib/utils";
import { createEmptyButton } from "./schema";

interface MeaItemEditorProps {
  item: MeaItem;
  isActive: boolean;
  briefWeek: number;
  onUpdate: (updates: Partial<MeaItem>) => void;
  onRemove: () => void;
  onOpenMediaLibrary: () => void;
}

export function MeaItemEditor({
  item,
  isActive,
  briefWeek,
  onUpdate,
  onRemove,
  onOpenMediaLibrary,
}: MeaItemEditorProps) {
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

  // Backwards compat
  const buttons: MeaButton[] = item.buttons ?? [createEmptyButton()];

  const updateButton = (index: number, updates: Partial<MeaButton>) => {
    const next = buttons.map((btn, i) => (i === index ? { ...btn, ...updates } : btn));
    onUpdate({ buttons: next });
  };

  const addButton = () => {
    onUpdate({ buttons: [...buttons, createEmptyButton()] });
  };

  const removeButton = (index: number) => {
    if (buttons.length <= 1) return;
    onUpdate({ buttons: buttons.filter((_, i) => i !== index) });
  };

  const pricingMode = item.pricingMode ?? "standard";

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
        {/* Drag handle */}
        <button
          type="button"
          className="mt-2.5 cursor-grab touch-none text-muted-foreground/40 hover:text-muted-foreground transition-colors"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4" />
        </button>

        {/* Left column: image + opacity + position */}
        <div className="flex flex-col items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={onOpenMediaLibrary}
            className="flex items-center justify-center overflow-hidden border-2 border-dashed border-muted-foreground/20 bg-white transition-all hover:border-primary/40 hover:bg-primary/5"
            style={{ width: 150, height: 100 }}
          >
            {item.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={item.imageUrl}
                alt={item.title}
                className="h-full w-full object-contain"
                style={{ opacity: item.imageOpacity }}
              />
            ) : (
              <ImageIcon className="h-6 w-6 text-muted-foreground/40" />
            )}
          </button>

          <div className="flex items-center gap-2 w-full mt-1 justify-center">
            <div className="flex items-center gap-1 border rounded-md px-1.5 h-7">
              <span className="text-[9px] text-muted-foreground/60">Opacité</span>
              <Input
                type="number"
                min="0" max="1" step="0.1"
                value={item.imageOpacity}
                onChange={(e) => onUpdate({ imageOpacity: parseFloat(e.target.value) || 1 })}
                className="h-5 w-10 text-[10px] px-0.5 text-center border-0 rounded-none focus-visible:ring-0 shadow-none"
              />
            </div>
            <div className="flex items-center gap-1 border rounded-md px-1.5 h-7">
              <span className="text-[9px] text-muted-foreground/60">Position</span>
              <Input
                type="number"
                min="0" max="100" step="5"
                value={item.imagePosition ?? 50}
                onChange={(e) => onUpdate({ imagePosition: parseInt(e.target.value) || 50 })}
                className="h-5 w-10 text-[10px] px-0.5 text-center border-0 rounded-none focus-visible:ring-0 shadow-none"
              />
            </div>
          </div>
        </div>

        {/* Right column: form fields */}
        <div className="flex-1 space-y-2">
          {/* Row 1: Semaine + ID */}
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
              <TriangleAlert className="h-4 w-4 shrink-0 text-amber-500" />
            )}
            <span
              className="text-[10px] text-muted-foreground/50 truncate"
              title={item.imageId}
            >
              ID: {item.imageId}
            </span>
          </div>

          {/* Row 1: Logo Marque + Overlay */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 border rounded-md px-2 h-8">
              <span className="text-[10px] text-muted-foreground">Logo Marque</span>
              <Switch
                checked={item.showBrandLogo}
                onCheckedChange={(c) => onUpdate({ showBrandLogo: c })}
                className="scale-75"
              />
              {item.showBrandLogo && (
                <Input
                  placeholder="svg/marque.svg"
                  value={item.brandLogoPath ?? ""}
                  onChange={(e) => onUpdate({ brandLogoPath: e.target.value })}
                  className="h-6 w-36 text-xs px-1"
                />
              )}
            </div>

            <Select
              value={item.overlayType}
              onValueChange={(v) => onUpdate({ overlayType: v as MeaOverlayType })}
            >
              <SelectTrigger className="h-8 w-[110px] shrink-0 text-xs">
                <SelectValue placeholder="Overlay" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sans texte</SelectItem>
                <SelectItem value="label">Badge Rond</SelectItem>
                <SelectItem value="text">Texte</SelectItem>
              </SelectContent>
            </Select>

            {(item.overlayType === "label" || item.overlayType === "text") && (
              <Input
                placeholder="Texte Overlay"
                value={item.overlayText}
                onChange={(e) => onUpdate({ overlayText: e.target.value })}
                className="h-8 min-w-[180px] flex-1 text-xs"
              />
            )}
          </div>

          {/* Row 2: Title */}
          <Input
            placeholder="Titre Principal"
            value={item.title}
            onChange={(e) => onUpdate({ title: e.target.value })}
            className="h-9 text-sm font-semibold"
          />

          {/* Row 3: Pricing Mode + fields */}
          <div className="flex items-center gap-2 bg-muted/40 p-1.5 rounded-md flex-wrap">
            <Select
              value={pricingMode}
              onValueChange={(v) => onUpdate({ pricingMode: v as MeaPricingMode })}
            >
              <SelectTrigger className="h-7 flex-1 text-xs">
                <SelectValue placeholder="Mode prix" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="standard">Standard</SelectItem>
                <SelectItem value="strikethrough">Prix barré</SelectItem>
                <SelectItem value="custom">Custom</SelectItem>
              </SelectContent>
            </Select>

            {/* Standard mode */}
            {pricingMode === "standard" && (
              <>
                <div className="flex items-center gap-1">
                  <Switch
                    checked={item.showPrePrice}
                    onCheckedChange={(c) => onUpdate({ showPrePrice: c })}
                    className="scale-75"
                  />
                  {item.showPrePrice && (
                    <Input
                      placeholder="À partir de"
                      value={item.prePriceText}
                      onChange={(e) => onUpdate({ prePriceText: e.target.value })}
                      className="h-7 w-24 text-xs px-1"
                    />
                  )}
                </div>
                <Input
                  placeholder="Prix initial"
                  value={item.initialPrice}
                  onChange={(e) => onUpdate({ initialPrice: e.target.value })}
                  className="h-7 w-24 text-xs"
                />
                <Input
                  placeholder="Prix Club"
                  value={item.clubPrice}
                  onChange={(e) => onUpdate({ clubPrice: e.target.value })}
                  className="h-7 w-24 text-xs"
                />
              </>
            )}

            {/* Strikethrough mode */}
            {pricingMode === "strikethrough" && (
              <>
                <Input
                  placeholder="Prix barré"
                  value={item.initialPrice}
                  onChange={(e) => onUpdate({ initialPrice: e.target.value })}
                  className="h-7 w-32 text-xs"
                />
                <Input
                  placeholder="Prix club"
                  value={item.clubPrice}
                  onChange={(e) => onUpdate({ clubPrice: e.target.value })}
                  className="h-7 w-32 text-xs font-bold"
                />
              </>
            )}

            {/* Custom mode */}
            {pricingMode === "custom" && (
              <Input
                placeholder="Texte libre"
                value={item.customPriceText ?? ""}
                onChange={(e) => onUpdate({ customPriceText: e.target.value })}
                className="h-7 flex-1 text-xs"
              />
            )}
          </div>

          {/* Row 4: Club details – for standard AND strikethrough modes */}
          {(pricingMode === "standard" || pricingMode === "strikethrough") && (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-muted-foreground">Club Txt</span>
                <Switch
                  checked={item.showClubLabel}
                  onCheckedChange={(c) => onUpdate({ showClubLabel: c })}
                  className="scale-75"
                />
                {item.showClubLabel && (
                  <Input
                    placeholder="Promo*"
                    value={item.clubLabelText}
                    onChange={(e) => onUpdate({ clubLabelText: e.target.value })}
                    className="h-6 w-20 text-xs px-1"
                  />
                )}
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-muted-foreground">Club Logo</span>
                <Switch
                  checked={item.showClubIcon}
                  onCheckedChange={(c) => onUpdate({ showClubIcon: c })}
                  className="scale-75"
                />
              </div>
            </div>
          )}

          {/* Row 5+: Buttons with individual links */}
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
                  onValueChange={(v) =>
                    v && updateButton(idx, { linkType: v as "cgid" | "url" | "cid" })
                  }
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

          {/* Commentaire (dev) - optionnel (dernier champ) */}
          <div className="space-y-1">
            <span className="text-[11px] text-muted-foreground">commentaire</span>
            <Input
              placeholder="commentaire..."
              value={item.comment ?? ""}
              onChange={(e) => onUpdate({ comment: e.target.value })}
              className={cn(
                "h-9 text-sm",
                (item.comment ?? "").trim()
                  ? "border-red-500 border-l-[3px]! border-l-red-500! focus-visible:ring-2 focus-visible:ring-red-500/40"
                  : "",
              )}
            />
          </div>
        </div>

        {/* Far right: visibility + week warning + delete */}
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
            <DialogTitle>Supprimer cette MEA ?</DialogTitle>
            <DialogDescription>
              Cette action est irreversible. La MEA sera définitivement supprimée.
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
