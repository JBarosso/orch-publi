"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Upload, Search, Video, Pencil, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { looksLikeMp4 } from "@/lib/upload-specs";
import type { Asset, AssetType } from "@/types";

interface MediaLibraryDialogProps {
  onSelect: (url: string) => void;
  onClose: () => void;
  onUploadNew: (file?: File, type?: AssetType) => void;
  initialType?: AssetType;
}

export function MediaLibraryDialog({
  onSelect,
  onClose,
  onUploadNew,
  initialType = "other",
}: MediaLibraryDialogProps) {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [search, setSearch] = useState("");
  const [filterWeek, setFilterWeek] = useState("");
  const [filterYear, setFilterYear] = useState("");
  const [filterType, setFilterType] = useState<AssetType | "">(initialType);
  const [yearOptions, setYearOptions] = useState<number[]>([]);
  const [weekOptions, setWeekOptions] = useState<number[]>([]);
  const [typeOptions, setTypeOptions] = useState<AssetType[]>([]);
  const [loading, setLoading] = useState(true);
  const [dragging, setDragging] = useState(false);
  const [dragCounter, setDragCounter] = useState(0);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  const saveLabel = async (id: string) => {
    const res = await fetch("/api/assets", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, label: editValue }),
    });
    if (res.ok) {
      const updated = await res.json();
      setAssets((prev) => prev.map((a) => (a.id === id ? { ...a, label: updated.label } : a)));
    }
    setEditingId(null);
  };

  useEffect(() => {
    const fetchAssets = async () => {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (filterWeek) params.set("week", filterWeek);
      if (filterYear) params.set("year", filterYear);
      if (filterType) params.set("type", filterType);
      const res = await fetch(`/api/assets?${params}`);
      if (!res.ok) {
        setLoading(false);
        setAssets([]);
        return;
      }
      const data = await res.json();
      setAssets(data);
      setLoading(false);
    };

    const timer = setTimeout(fetchAssets, 300);
    return () => clearTimeout(timer);
  }, [search, filterWeek, filterYear, filterType]);

  useEffect(() => {
    const fetchFilterOptions = async () => {
      const res = await fetch("/api/assets/filters");
      if (!res.ok) return;
      const data = await res.json();
      setYearOptions(data.years ?? []);
      setWeekOptions(data.weeks ?? []);
      setTypeOptions(data.types ?? []);
    };
    fetchFilterOptions();
  }, []);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragCounter((c) => c + 1);
    setDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragCounter((c) => {
      const next = c - 1;
      if (next <= 0) setDragging(false);
      return Math.max(0, next);
    });
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      setDragCounter(0);
      const file = e.dataTransfer.files?.[0];
      if (file && (file.type.startsWith("image/") || file.type.startsWith("video/") || looksLikeMp4(file))) {
        onUploadNew(file, filterType || initialType);
      }
    },
    [onUploadNew],
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
          <DialogTitle>Médiathèque</DialogTitle>
        </DialogHeader>

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
            onChange={(e) => setFilterType(e.target.value as AssetType | "")}
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
                    {asset.mimeType?.startsWith("video/") ? (
                      <div className="flex aspect-square w-full flex-col items-center justify-center gap-1 bg-muted p-2">
                        <Video className="h-6 w-6 text-muted-foreground/60" />
                        <span className="truncate text-[10px] text-muted-foreground/60">
                          {asset.label || "Vidéo"}
                        </span>
                      </div>
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={asset.url}
                        alt={asset.label}
                        className="aspect-square w-full object-cover"
                      />
                    )}
                  </button>

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
