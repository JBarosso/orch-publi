"use client";

import { Image as ImageIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useFileDrop } from "@/lib/use-file-drop";
import { ImageRemoveButton, INLINE_REMOVE } from "@/components/editor/image-remove-button";
import { DEFAULT_BRAND_LOGO_WIDTH, type BrandLogoFields } from "@/lib/brand-logo";

interface BrandLogoFieldProps {
  logo: BrandLogoFields;
  onChange: (patch: Partial<BrandLogoFields>) => void;
  onOpenLibrary: () => void;
  onDropFile?: (file: File) => void;
  /** Le format du chemin diffère selon le template (complet ou relatif). */
  pathPlaceholder: string;
}

/**
 * Réglages d'un logo marque affiché : chemin CMS ou image uploadée (clic pour
 * la médiathèque, ou glisser-déposer un fichier), puis largeur d'affichage.
 * L'interrupteur qui affiche ou masque le logo reste dans chaque éditeur, dont
 * la mise en page diffère.
 */
export function BrandLogoField({
  logo,
  onChange,
  onOpenLibrary,
  onDropFile,
  pathPlaceholder,
}: BrandLogoFieldProps) {
  const { isDraggingOver, dropHandlers } = useFileDrop((file) => onDropFile?.(file));
  const source = logo.brandLogoSource ?? "path";

  return (
    <>
      {([
        ["path", "Chemin"],
        ["image", "Image"],
      ] as const).map(([value, text]) => (
        <button
          key={value}
          type="button"
          onClick={() => onChange({ brandLogoSource: value })}
          className={cn(
            "h-6 rounded px-1.5 text-[10px] transition-colors",
            source === value ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted",
          )}
        >
          {text}
        </button>
      ))}
      {source === "image" ? (
        <>
        <button
          type="button"
          onClick={onOpenLibrary}
          {...dropHandlers}
          className={cn(
            "flex h-6 items-center gap-1 rounded border border-dashed border-muted-foreground/30 px-1.5 text-[10px] text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground",
            isDraggingOver && "border-primary bg-primary/10 text-foreground",
          )}
        >
          {logo.brandLogoUrl ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={logo.brandLogoUrl} alt="" className="h-4 w-auto max-w-10 object-contain" />
              Changer
            </>
          ) : (
            <>
              <ImageIcon className="h-3 w-3" />
              Choisir
            </>
          )}
        </button>
        {logo.brandLogoUrl && (
          <ImageRemoveButton onRemove={() => onChange({ brandLogoUrl: "" })} className={INLINE_REMOVE} />
        )}
        </>
      ) : (
        <Input
          placeholder={pathPlaceholder}
          value={logo.brandLogoPath ?? ""}
          onChange={(e) => onChange({ brandLogoPath: e.target.value })}
          className="h-6 w-48 px-1 text-xs"
        />
      )}
      <Input
        type="number"
        min={10}
        max={1000}
        value={logo.brandLogoWidth ?? DEFAULT_BRAND_LOGO_WIDTH}
        onChange={(e) => onChange({ brandLogoWidth: Number(e.target.value) || DEFAULT_BRAND_LOGO_WIDTH })}
        title="Largeur d'affichage du logo, en pixels"
        className="h-6 w-14 px-1 text-xs"
      />
      <span className="text-[10px] text-muted-foreground">px</span>
    </>
  );
}
