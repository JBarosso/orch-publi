"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Upload, Search, Pencil, Check, X, ExternalLink } from "lucide-react";
import { AssetThumbnail } from "@/components/media/asset-thumbnail";
import { cn } from "@/lib/utils";
import { looksLikeMp4 } from "@/lib/upload-specs";
import { rememberDropOrigin } from "@/lib/post-asset";
import { useLocalMode } from "@/lib/local-mode";
import { assetFilterOptions, findAssetByUrl, renameAsset, searchAssets } from "@/lib/asset-source";
import type { Asset, AssetType } from "@/types";

interface MediaLibraryDialogProps {
  onSelect: (url: string) => void;
  onClose: () => void;
  onUploadNew: (file?: File, type?: AssetType) => void;
  initialType?: AssetType;
  /** Image déjà en place dans l'emplacement cliqué : son URL d'origine est rappelée en tête. */
  currentUrl?: string;
}

export function MediaLibraryDialog({
  onSelect,
  onClose,
  onUploadNew,
  initialType = "other",
  currentUrl = "",
}: MediaLibraryDialogProps) {
  // En mode local, la médiathèque est celle de ce poste : aucune requête ne
  // part vers le serveur (cf. asset-source.ts).
  const localMode = useLocalMode();
  // undefined = pas encore chargé (ou image hors médiathèque) : rien affiché.
  const [current, setCurrent] = useState<Asset | undefined>(undefined);
  useEffect(() => {
    if (!currentUrl) return;
    findAssetByUrl(currentUrl)
      .then(setCurrent)
      .catch(() => {});
  }, [currentUrl]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [search, setSearch] = useState("");
  const [filterWeek, setFilterWeek] = useState("");
  const [filterYear, setFilterYear] = useState("");
  const [filterType, setFilterType] = useState<AssetType | "">(initialType);
  // Un filtre choisi à la main est respecté tel quel, même s'il ne ramène
  // rien — seul le filtre déduit du contexte peut être abandonné (cf. plus bas).
  const filterPickedByUser = useRef(false);
  const [yearOptions, setYearOptions] = useState<number[]>([]);
  const [weekOptions, setWeekOptions] = useState<number[]>([]);
  const [typeOptions, setTypeOptions] = useState<AssetType[]>([]);
  const [loading, setLoading] = useState(true);
  const [dragging, setDragging] = useState(false);
  // Compteur enter/leave (les enfants déclenchent aussi dragleave) — jamais
  // rendu, donc une ref suffit ; seul `dragging` pilote l'affichage.
  const dragCounterRef = useRef(0);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  const saveLabel = async (id: string) => {
    const asset = assets.find((a) => a.id === id);
    const label = asset ? await renameAsset(asset, editValue).catch(() => null) : null;
    if (label !== null) {
      setAssets((prev) => prev.map((a) => (a.id === id ? { ...a, label } : a)));
    }
    setEditingId(null);
  };

  useEffect(() => {
    const fetchAssets = async () => {
      setLoading(true);
      const data = await searchAssets(
        { search, week: filterWeek, year: filterYear, type: filterType },
        localMode,
      ).catch(() => null);
      if (!data) {
        setLoading(false);
        setAssets([]);
        return;
      }
      // Le dialogue s'ouvre pré-filtré sur le type de l'emplacement visé, ce
      // qui tombe à vide pour un type récent dont aucune image n'a encore été
      // taguée : on affichait alors une médiathèque vide alors que la
      // bibliothèque est pleine. On élargit à tous les types plutôt que de
      // laisser l'utilisateur deviner qu'il doit toucher au filtre.
      if (data.length === 0 && filterType && !filterPickedByUser.current) {
        setFilterType("");
        return;
      }
      setAssets(data);
      setLoading(false);
    };

    const timer = setTimeout(fetchAssets, 300);
    return () => clearTimeout(timer);
  }, [search, filterWeek, filterYear, filterType, localMode]);

  useEffect(() => {
    const fetchFilterOptions = async () => {
      const data = await assetFilterOptions(localMode).catch(() => null);
      if (!data) return;
      setYearOptions(data.years ?? []);
      setWeekOptions(data.weeks ?? []);
      setTypeOptions((data.types ?? []) as AssetType[]);
    };
    fetchFilterOptions();
  }, [localMode]);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    dragCounterRef.current += 1;
    setDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    dragCounterRef.current = Math.max(0, dragCounterRef.current - 1);
    if (dragCounterRef.current === 0) setDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      dragCounterRef.current = 0;
      const file = e.dataTransfer.files?.[0];
      if (file && (file.type.startsWith("image/") || file.type.startsWith("video/") || looksLikeMp4(file))) {
        rememberDropOrigin(file, e.dataTransfer);
        onUploadNew(file, filterType || initialType);
      }
    },
    [onUploadNew, filterType, initialType],
  );

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent
        className="max-w-2xl"
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <DialogHeader>
          <DialogTitle>{localMode ? "Médiathèque de ce poste" : "Médiathèque"}</DialogTitle>
        </DialogHeader>
        {localMode && (
          <p className="-mt-2 text-xs text-amber-700">
            Mode local : seules les images ajoutées dans ce navigateur sont proposées.
          </p>
        )}

        {current && (
          <div className="flex min-w-0 items-center gap-2 rounded-md bg-muted/50 px-2.5 py-1.5 text-xs">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={current.url} alt="" className="h-7 w-7 shrink-0 rounded object-cover" />
            <span className="shrink-0 text-muted-foreground">Image actuelle — origine :</span>
            {current.originUrl ? (
              <a
                href={current.originUrl}
                target="_blank"
                rel="noopener noreferrer"
                title={current.originUrl}
                className="flex min-w-0 items-center gap-1 text-primary hover:underline"
              >
                <ExternalLink className="h-3 w-3 shrink-0" />
                <span className="truncate">{current.originUrl}</span>
              </a>
            ) : (
              <span className="text-muted-foreground/70">
                aucune URL enregistrée (image importée depuis l&apos;ordinateur, ou avant cette fonctionnalité)
              </span>
            )}
          </div>
        )}

        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher par label..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button variant="outline" onClick={() => onUploadNew(undefined, filterType || initialType)}>
            <Upload className="mr-1 h-4 w-4" />
            Upload
          </Button>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <select
            value={filterType}
            onChange={(e) => {
              filterPickedByUser.current = true;
              setFilterType(e.target.value as AssetType | "");
            }}
            className="h-9 rounded-md border border-input bg-transparent px-3 text-sm outline-none"
          >
            <option value="">Tous les types</option>
            {typeOptions.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
          <select
            value={filterYear}
            onChange={(e) => setFilterYear(e.target.value)}
            className="h-9 rounded-md border border-input bg-transparent px-3 text-sm outline-none"
          >
            <option value="">Toutes les années</option>
            {yearOptions.map((year) => (
              <option key={year} value={String(year)}>
                {year}
              </option>
            ))}
          </select>
          <select
            value={filterWeek}
            onChange={(e) => setFilterWeek(e.target.value)}
            className="h-9 rounded-md border border-input bg-transparent px-3 text-sm outline-none"
          >
            <option value="">Toutes les semaines</option>
            {weekOptions.map((week) => (
              <option key={week} value={String(week)}>
                Semaine {week}
              </option>
            ))}
          </select>
        </div>

        <div className="relative max-h-150 overflow-y-auto">
          {dragging && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-primary bg-primary/5 backdrop-blur-sm">
              <Upload className="mb-2 h-8 w-8 text-primary" />
              <p className="text-sm font-medium text-primary">
                Déposez l&apos;image ici
              </p>
            </div>
          )}

          {loading ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Chargement...
            </p>
          ) : assets.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-sm text-muted-foreground">
                Aucune image trouvée
              </p>
              <Button
                variant="link"
                className="mt-2"
                onClick={() => onUploadNew(undefined, filterType || initialType)}
              >
                Uploader une image
              </Button>
            </div>
          ) : (
            <div className={cn("grid grid-cols-4 gap-3", dragging && "opacity-30 pointer-events-none")}>
              {assets.map((asset) => (
                <div
                  key={asset.id}
                  className="group relative overflow-hidden rounded-lg border transition-all hover:ring-2 hover:ring-primary"
                >
                  <button type="button" onClick={() => onSelect(asset.url)} className="block w-full">
                    <AssetThumbnail asset={asset} />
                  </button>

                  {asset.originUrl && (
                    <a
                      href={asset.originUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      title={asset.originUrl}
                      className="absolute left-1 top-1 rounded bg-black/60 p-1 text-white opacity-0 transition-opacity hover:bg-black/80 group-hover:opacity-100"
                    >
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}

                  {editingId === asset.id ? (
                    <div className="absolute inset-x-0 bottom-0 flex items-center gap-1 bg-black/80 px-1.5 py-1">
                      <Input
                        autoFocus
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") saveLabel(asset.id);
                          if (e.key === "Escape") setEditingId(null);
                        }}
                        className="h-6 flex-1 border-0 bg-transparent px-1 text-xs text-white focus-visible:ring-1"
                      />
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          saveLabel(asset.id);
                        }}
                        className="shrink-0 text-emerald-400 hover:text-emerald-300"
                      >
                        <Check className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingId(null);
                        }}
                        className="shrink-0 text-white/70 hover:text-white"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="absolute inset-x-0 bottom-0 bg-black/60 px-2 py-1 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100">
                        {asset.label || "Sans label"}
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingId(asset.id);
                          setEditValue(asset.label ?? "");
                        }}
                        className="absolute right-1 top-1 rounded bg-black/60 p-1 text-white opacity-0 transition-opacity hover:bg-black/80 group-hover:opacity-100"
                        title="Modifier le label"
                      >
                        <Pencil className="h-3 w-3" />
                      </button>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
