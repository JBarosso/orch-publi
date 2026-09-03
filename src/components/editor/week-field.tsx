"use client";

import { TriangleAlert } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";

interface GlobalImageProps {
  isGlobalImage: boolean;
  globalFileName: string;
  onChange: (updates: { isGlobalImage?: boolean; globalFileName?: string }) => void;
}

interface WeekFieldProps {
  imageWeek: number | null;
  briefWeek: number;
  imageId: string;
  onChange: (week: number | null) => void;
  /** Position figée à l'export quand la semaine diffère de celle du brief.
   * Ne passer la prop que pour les templates qui figent (macarons, MEA,
   * edito, img sous menu) — undefined pour carousel/MEA v2. */
  exportPosition?: number | null;
  /** Toggle "image globale" (chemin CMS sans segment locale) + nom de fichier
   * personnalisé. Ne passer que pour les templates qui la supportent
   * (quickaccess v2, MEA v2) — omis partout ailleurs. */
  global?: GlobalImageProps;
}

/**
 * Ligne "Semaine + avertissement + ID" partagée par tous les éditeurs
 * d'items : input semaine, triangle si elle diffère de celle du brief
 * (avec position figée le cas échéant) et ID de l'image.
 */
export function WeekField({
  imageWeek,
  briefWeek,
  imageId,
  onChange,
  exportPosition,
  global,
}: WeekFieldProps) {
  return (
    <div className="space-y-1">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[10px] text-muted-foreground/70 shrink-0">
          Semaine
        </span>
        <Input
          type="number"
          placeholder="Semaine"
          value={imageWeek ?? briefWeek}
          onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
          min={1}
          max={53}
          className="h-8 w-28 text-sm"
        />
        {imageWeek != null && imageWeek !== briefWeek && (
          <span
            title={
              exportPosition != null
                ? `Semaine différente de celle du brief — position figée à ${exportPosition} (déplacer l'item ne la change plus ; réuploader une image la défige)`
                : "La semaine est différente de celle du brief"
            }
            className="flex items-center gap-0.5"
          >
            <TriangleAlert className="h-4 w-4 shrink-0 text-amber-500" />
            {exportPosition != null && (
              <span className="text-[9px] font-medium text-amber-600">
                #{exportPosition} figé
              </span>
            )}
          </span>
        )}
        <span
          className="text-[10px] text-muted-foreground/50 truncate"
          title={imageId}
        >
          ID: {imageId}
        </span>
        {global && (
          <span
            className="flex items-center gap-1"
            title="Image partagée entre langues : le chemin CMS omet le segment locale"
          >
            <Switch
              checked={global.isGlobalImage}
              onCheckedChange={(checked) => global.onChange({ isGlobalImage: checked })}
              className="scale-75"
            />
            <span className="text-[10px] text-muted-foreground/70">Global</span>
          </span>
        )}
      </div>
      {global?.isGlobalImage && (
        <Input
          placeholder="Nom de fichier (vide = nom par défaut)"
          value={global.globalFileName}
          onChange={(e) => global.onChange({ globalFileName: e.target.value })}
          className="h-7 text-xs"
        />
      )}
    </div>
  );
}
