"use client";

import { Image as ImageIcon } from "lucide-react";
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
import type { MeaV2Card, MeaButton, MeaPricingMode } from "@/types";
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
  /** Chemin custom de la section, hérité par la carte qui n'en définit pas. */
  sectionCustomPath?: string;
  briefYear: number;
  briefLocale: string;
}

export function MeaV2CardEditor({
  card,
  label,
  briefWeek,
  onUpdate,
  onOpenMediaLibrary,
  onDropFile,
  sectionCustomPath = "",
  briefYear,
  briefLocale,
}: MeaV2CardEditorProps) {
  const { isDraggingOver, dropHandlers } = useFileDrop((file) => onDropFile?.(file));
  // Anciennes données sans les champs prix/badge/marque (ajoutés après coup) :
  // mêmes defaults que createEmptyMeaV2Card, résolus ici pour ne jamais passer
  // undefined à un Switch/Input contrôlé.
  const buttons: MeaButton[] = card.buttons ?? [createEmptyButton()];
  const showBrandLogo = card.showBrandLogo ?? false;
  const showBadge = card.showBadge ?? false;
  const showMarketingTitle = card.showMarketingTitle ?? false;
  const pricingMode = card.pricingMode ?? "standard";
  const showPrePrice = card.showPrePrice ?? true;
  const showClubLabel = card.showClubLabel ?? true;
  const showClubIcon = card.showClubIcon ?? true;
  const isGlobalImage = card.isGlobalImage ?? false;
  const globalFileName = card.globalFileName ?? "";
  const useCustomPath = card.useCustomPath ?? false;
  const customPath = card.customPath ?? "";

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
          imagePath={{
            isGlobalImage,
            globalFileName,
            useCustomPath,
            customPath,
            sectionCustomPath,
            briefYear,
            briefLocale,
            onChange: onUpdate,
          }}
        />

        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 border rounded-md px-2 h-8">
            <span className="text-[10px] text-muted-foreground">Logo Marque</span>
            <Switch
              checked={showBrandLogo}
              onCheckedChange={(c) => onUpdate({ showBrandLogo: c })}
              className="scale-75"
            />
            {showBrandLogo && (
              <Input
                placeholder="logo-puericulture/svg/marque.svg"
                value={card.brandLogoPath ?? ""}
                onChange={(e) => onUpdate({ brandLogoPath: e.target.value })}
                className="h-6 w-48 text-xs px-1"
              />
            )}
          </div>

          <div className="flex items-center gap-1.5 border rounded-md px-2 h-8">
            <span className="text-[10px] text-muted-foreground">Badge</span>
            <Switch
              checked={showBadge}
              onCheckedChange={(c) => onUpdate({ showBadge: c })}
              className="scale-75"
            />
            {showBadge && (
              <Input
                placeholder="Best Price"
                value={card.badgeText ?? ""}
                onChange={(e) => onUpdate({ badgeText: e.target.value })}
                className="h-6 w-28 text-xs px-1"
              />
            )}
          </div>

          <div className="flex items-center gap-1.5 border rounded-md px-2 h-8">
            <span className="text-[10px] text-muted-foreground">Titre marketing</span>
            <Switch
              checked={showMarketingTitle}
              onCheckedChange={(c) => onUpdate({ showMarketingTitle: c })}
              className="scale-75"
            />
            {showMarketingTitle && (
              <Input
                placeholder="Jeu concours"
                value={card.marketingTitle ?? ""}
                onChange={(e) => onUpdate({ marketingTitle: e.target.value })}
                className="h-6 w-32 text-xs px-1"
              />
            )}
          </div>
        </div>

        <Input
          placeholder="Titre"
          value={card.title}
          onChange={(e) => onUpdate({ title: e.target.value })}
          className="h-9 text-sm font-semibold"
        />

        <div className="flex items-center gap-2 bg-muted/40 p-1.5 rounded-md flex-wrap">
          <Select
            value={pricingMode}
            items={{ custom: "Custom", strikethrough: "Prix barré", standard: "Standard" }}
            onValueChange={(v) => onUpdate({ pricingMode: v as MeaPricingMode })}
          >
            <SelectTrigger className="h-7 flex-1 text-xs">
              <SelectValue placeholder="Mode prix" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="custom">Custom</SelectItem>
              <SelectItem value="strikethrough">Prix barré</SelectItem>
              <SelectItem value="standard">Standard</SelectItem>
            </SelectContent>
          </Select>

          {pricingMode === "standard" && (
            <>
              <div className="flex items-center gap-1">
                <Switch
                  checked={showPrePrice}
                  onCheckedChange={(c) => onUpdate({ showPrePrice: c })}
                  className="scale-75"
                />
                {showPrePrice && (
                  <Input
                    placeholder="À partir de"
                    value={card.prePriceText ?? ""}
                    onChange={(e) => onUpdate({ prePriceText: e.target.value })}
                    className="h-7 w-24 text-xs px-1"
                  />
                )}
              </div>
              <Input
                placeholder="Prix initial"
                value={card.initialPrice ?? ""}
                onChange={(e) => onUpdate({ initialPrice: e.target.value })}
                className="h-7 w-24 text-xs"
              />
              <Input
                placeholder="Prix Club"
                value={card.clubPrice ?? ""}
                onChange={(e) => onUpdate({ clubPrice: e.target.value })}
                className="h-7 w-24 text-xs"
              />
            </>
          )}

          {pricingMode === "strikethrough" && (
            <>
              <Input
                placeholder="Prix barré"
                value={card.initialPrice ?? ""}
                onChange={(e) => onUpdate({ initialPrice: e.target.value })}
                className="h-7 w-32 text-xs"
              />
              <Input
                placeholder="Prix club"
                value={card.clubPrice ?? ""}
                onChange={(e) => onUpdate({ clubPrice: e.target.value })}
                className="h-7 w-32 text-xs font-bold"
              />
            </>
          )}

          {pricingMode === "custom" && (
            <Input
              placeholder="Texte libre"
              value={card.customPriceText ?? ""}
              onChange={(e) => onUpdate({ customPriceText: e.target.value })}
              className="h-7 flex-1 text-xs"
            />
          )}
        </div>

        {(pricingMode === "standard" || pricingMode === "strikethrough") && (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-muted-foreground">Club Txt</span>
              <Switch
                checked={showClubLabel}
                onCheckedChange={(c) => onUpdate({ showClubLabel: c })}
                className="scale-75"
              />
              {showClubLabel && (
                <Input
                  placeholder="Promo*"
                  value={card.clubLabelText ?? ""}
                  onChange={(e) => onUpdate({ clubLabelText: e.target.value })}
                  className="h-6 w-20 text-xs px-1"
                />
              )}
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-muted-foreground">Club Logo</span>
              <Switch
                checked={showClubIcon}
                onCheckedChange={(c) => onUpdate({ showClubIcon: c })}
                className="scale-75"
              />
            </div>
          </div>
        )}

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
