"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Upload, Trash2, ImageOff } from "lucide-react";
import { toast } from "sonner";
import type { Asset } from "@/types";
import { ImageUploadDialog } from "@/components/media/image-upload-dialog";

export default function MediaPage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [search, setSearch] = useState("");
  const [filterWeek, setFilterWeek] = useState("");
  const [filterYear, setFilterYear] = useState("");
  const [yearOptions, setYearOptions] = useState<number[]>([]);
  const [weekOptions, setWeekOptions] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [backfilling, setBackfilling] = useState(false);
  const [showUpload, setShowUpload] = useState(false);

  const fetchAssets = async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (filterWeek) params.set("week", filterWeek);
    if (filterYear) params.set("year", filterYear);
    const res = await fetch(`/api/assets?${params}`);
    if (!res.ok) {
      setLoading(false);
      toast.error("Impossible de charger la médiathèque");
      return;
    }
    const data = await res.json();
    setAssets(data);
    setLoading(false);
  };

  const fetchFilterOptions = async () => {
    const res = await fetch("/api/assets/filters");
    if (!res.ok) return;
    const data = await res.json();
    setYearOptions(data.years ?? []);
    setWeekOptions(data.weeks ?? []);
  };

  useEffect(() => {
    const timer = setTimeout(fetchAssets, 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, filterWeek, filterYear]);

  useEffect(() => {
    fetchFilterOptions();
  }, []);

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-8 flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Médiathèque
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Gérez vos images et assets
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            disabled={backfilling}
            onClick={async () => {
              setBackfilling(true);
              try {
                const res = await fetch("/api/assets/backfill", { method: "POST" });
                const data = await res.json().catch(() => ({}));
                if (!res.ok) {
                  toast.error(data.error || "Backfill impossible");
                  return;
                }
                toast.success(`${data.updated ?? 0} image(s) mises à jour`);
                fetchAssets();
                fetchFilterOptions();
              } finally {
                setBackfilling(false);
              }
            }}
          >
            {backfilling ? "Synchronisation..." : "Synchroniser year/week"}
          </Button>
          <Button
            onClick={() => setShowUpload(true)}
            className="shadow-sm shadow-primary/20"
          >
            <Upload className="mr-1.5 h-4 w-4" />
            Uploader une image
          </Button>
        </div>
      </div>

      <div className="mb-6 grid gap-3 md:grid-cols-[minmax(0,1fr)_180px_180px]">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/50" />
          <Input
            placeholder="Rechercher par label..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-10 pl-9"
          />
        </div>
        <select
          value={filterYear}
          onChange={(e) => setFilterYear(e.target.value)}
          className="h-10 rounded-md border border-input bg-transparent px-3 text-sm outline-none"
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
          className="h-10 rounded-md border border-input bg-transparent px-3 text-sm outline-none"
        >
          <option value="">Toutes les semaines</option>
          {weekOptions.map((week) => (
            <option key={week} value={String(week)}>
              Semaine {week}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="py-16 text-center text-sm text-muted-foreground">
          Chargement...
        </div>
      ) : assets.length === 0 ? (
        <div className="py-16 text-center">
          <ImageOff className="mx-auto mb-3 h-10 w-10 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">Aucune image trouvée</p>
          <Button
            variant="link"
            className="mt-2"
            onClick={() => setShowUpload(true)}
          >
            Uploader votre première image
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {assets.map((asset) => (
            <div
              key={asset.id}
              className="group relative overflow-hidden rounded-lg border border-border/60 bg-card shadow-sm transition-shadow hover:shadow-md"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={asset.url}
                alt={asset.label}
                className="aspect-square w-full object-cover"
              />
              <div className="p-2.5">
                <p className="truncate text-xs font-medium text-foreground">
                  {asset.label || "Sans label"}
                </p>
                <p className="text-[10px] text-muted-foreground/60">
                  {new Date(asset.createdAt).toLocaleDateString("fr-FR")}
                </p>
                {(asset.year || asset.week) && (
                  <p className="text-[10px] text-muted-foreground/60">
                    {asset.year ?? "----"} / S{asset.week ?? "--"}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={async (e) => {
                  e.stopPropagation();
                  if (!confirm("Supprimer cette image ?")) return;
                  const res = await fetch(`/api/assets?id=${asset.id}`, { method: "DELETE" });
                  if (res.ok) {
                    toast.success("Image supprimée");
                    fetchAssets();
                  } else {
                    toast.error("Erreur lors de la suppression");
                  }
                }}
                className="absolute right-2 top-2 rounded-lg bg-black/50 p-1.5 text-white opacity-0 backdrop-blur-sm transition-opacity hover:bg-red-600/80 group-hover:opacity-100"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {showUpload && (
        <ImageUploadDialog
          onUploaded={() => {
            setShowUpload(false);
            fetchAssets();
          }}
          onClose={() => setShowUpload(false)}
        />
      )}
    </div>
  );
}
