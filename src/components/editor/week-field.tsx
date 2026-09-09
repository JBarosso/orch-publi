"use client";

import { TriangleAlert } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { resolveCmsFolder } from "@/lib/cms-image-path";
import { cmsLocalePath } from "@/lib/utils";

interface ImagePathProps {
  isGlobalImage: boolean;
  globalFileName: string;
  useCustomPath: boolean;
  customPath: string;
  /** Chemin de la section, hérité quand l'item n'en définit pas — affiché en
   * placeholder pour que l'utilisateur voie ce qui sera réellement utilisé. */
  sectionCustomPath: string;
  /** Année et langue du brief : servent à afficher le dossier CMS résolu. */
  briefYear: number;
  briefLocale: string;
  onChange: (updates: {
    isGlobalImage?: boolean;
    globalFileName?: string;
    useCustomPath?: boolean;
    customPath?: string;
  }) => void;
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
  /** Réglages de chemin CMS de l'image : toggle "globale" (sans segment
   * locale) + nom de fichier, et toggle "chemin custom" + chemin. Ne passer
   * que pour les templates qui les supportent (quickaccess v2, MEA v2) —
   * omis partout ailleurs. */
  imagePath?: ImagePathProps;
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
  imagePath,
}: WeekFieldProps) {
  // Dossier CMS réellement utilisé, affiché uniquement quand l'item s'écarte
  // du défaut (image globale, chemin personnalisé, ou semaine différente de
  // celle du brief). Dans le cas normal la ligne resterait identique pour
  // tous les items : ce serait du bruit. Passe par le même résolveur que
  // l'export, donc ne peut pas diverger de ce qui sera réellement généré.
  const deviates =
    !!imagePath &&
    (imagePath.isGlobalImage ||
      imagePath.useCustomPath ||
      (imageWeek != null && imageWeek !== briefWeek));

  const resolvedFolder = !deviates
    ? ""
    : `${resolveCmsFolder(
        imagePath,
        imagePath.sectionCustomPath,
        { year: imagePath.briefYear, week: briefWeek },
        imageWeek,
      )}${imagePath.isGlobalImage ? "" : `/${cmsLocalePath(imagePath.briefLocale)}`}/`;

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
        {imagePath && (
          <>
            <span
              className="flex items-center gap-1"
              title="Image partagée entre langues : le chemin CMS omet le segment locale"
            >
              <Switch
                checked={imagePath.isGlobalImage}
                onCheckedChange={(checked) => imagePath.onChange({ isGlobalImage: checked })}
                className="scale-75"
              />
              <span className="text-[10px] text-muted-foreground/70">Global</span>
            </span>
            <span
              className="flex items-center gap-1"
              title="Remplace homepage/{année}/wk{semaine} par un chemin choisi, avant le segment langue"
            >
              <Switch
                checked={imagePath.useCustomPath}
                onCheckedChange={(checked) => imagePath.onChange({ useCustomPath: checked })}
                className="scale-75"
              />
              <span className="text-[10px] text-muted-foreground/70">Chemin custom</span>
            </span>
          </>
        )}
      </div>
      {imagePath?.isGlobalImage && (
        <Input
          placeholder="Nom de fichier (vide = nom par défaut)"
          value={imagePath.globalFileName}
          onChange={(e) => imagePath.onChange({ globalFileName: e.target.value })}
          className="h-7 text-xs"
        />
      )}
      {imagePath?.useCustomPath && (
        <Input
          placeholder={
            imagePath.sectionCustomPath.trim()
              ? `Chemin de la section : ${imagePath.sectionCustomPath.trim()}`
              : "Chemin custom (ex: landing-pages/fille/campagne)"
          }
          value={imagePath.customPath}
          onChange={(e) => imagePath.onChange({ customPath: e.target.value })}
          className="h-7 text-xs"
        />
      )}
      {resolvedFolder && (
        <p
          className="truncate font-mono text-[10px] text-muted-foreground/70"
          title={`Dossier CMS où sera déposée l'image : ${resolvedFolder}`}
        >
          → {resolvedFolder}
        </p>
      )}
    </div>
  );
}
