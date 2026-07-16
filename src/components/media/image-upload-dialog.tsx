"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import Cropper from "react-easy-crop";
import type { Area } from "react-easy-crop";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Upload } from "lucide-react";
import { toast } from "sonner";
import type { AssetType } from "@/types";
import {
  ACCEPTED_FORMATS_LABEL,
  ACCEPTED_MIME_ATTR,
  ASSET_SPECS,
  MAX_SOURCE_BYTES,
  formatBytes,
  normalizeAssetLabel,
  validateSourceDimensions,
  validateSourceFile,
} from "@/lib/upload-specs";

interface ImageUploadDialogProps {
  defaultLabel?: string;
  defaultWeek?: number;
  defaultYear?: number;
  assetType?: AssetType;
  /** Affiche un sélecteur de type (upload depuis la médiathèque) */
  allowTypeSelect?: boolean;
  initialFile?: File;
  cropShape?: "round" | "rect";
  cropAspect?: number;
  targetWidth?: number;
  targetHeight?: number;
  onUploaded: (url: string) => void;
  onClose: () => void;
}

// Client-side crop helper to ensure exact extraction with background fill
async function getCroppedImg(
  imageSrc: string,
  pixelCrop: Area,
  targetWidth?: number,
  targetHeight?: number
): Promise<string> {
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = imageSrc;
  });

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("No 2d context");

  // Output dimensions (use target dimensions if provided, else use crop area)
  canvas.width = targetWidth || pixelCrop.width;
  canvas.height = targetHeight || pixelCrop.height;

  // Fill white backgound
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Calculate scales if we are resizing to targetWidth/Height
  const scaleX = canvas.width / pixelCrop.width;
  const scaleY = canvas.height / pixelCrop.height;

  // Draw the image onto the canvas exactly as cropped
  // pixelCrop.x/y is the boundary mapped to original image res.
  ctx.save();
  ctx.scale(scaleX, scaleY);
  ctx.drawImage(
    image,
    0,
    0,
    image.width,
    image.height,
    -pixelCrop.x,
    -pixelCrop.y,
    image.width,
    image.height
  );
  ctx.restore();

  return canvas.toDataURL("image/jpeg", 0.95);
}

export function ImageUploadDialog({
  defaultLabel,
  defaultWeek,
  defaultYear,
  assetType = "other",
  allowTypeSelect = false,
  initialFile,
  cropShape,
  cropAspect,
  targetWidth,
  targetHeight,
  onUploaded,
  onClose,
}: ImageUploadDialogProps) {
  const [selectedType, setSelectedType] = useState<AssetType>(assetType);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [sourceDims, setSourceDims] = useState<{ width: number; height: number } | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [label, setLabel] = useState(defaultLabel ?? "");
  const [week, setWeek] = useState(defaultWeek != null ? String(defaultWeek) : "");
  const [year, setYear] = useState(defaultYear != null ? String(defaultYear) : "");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const initialFileProcessed = useRef(false);

  const spec = ASSET_SPECS[selectedType];
  // Les props explicites (éditeur de brief) priment sur la spec du type
  const effCropShape = cropShape ?? spec.cropShape;
  const effCropAspect = cropAspect ?? spec.cropAspect;
  const effTargetWidth = targetWidth ?? spec.targetWidth;
  const effTargetHeight = targetHeight ?? spec.targetHeight;
  // Pas de recadrage imposé : l'image est envoyée telle quelle,
  // dimensions et format d'origine conservés (poids optimisé côté serveur)
  const isFreeUpload = !effCropShape;

  // Allow zoom out so image can be smaller than container
  const minZoom = 0.3;

  const loadFile = useCallback(
    (file: File) => {
      const fileError = validateSourceFile(file);
      if (fileError) {
        toast.error(fileError);
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        const src = reader.result as string;
        const img = new Image();
        img.onload = () => {
          const dimError = validateSourceDimensions(img.width, img.height, spec);
          if (dimError) {
            toast.error(dimError);
            return;
          }
          setSourceDims({ width: img.width, height: img.height });
          setImageSrc(src);
        };
        img.onerror = () => toast.error("Impossible de lire cette image.");
        img.src = src;
      };
      reader.readAsDataURL(file);
    },
    [spec]
  );

  useEffect(() => {
    if (initialFile && !initialFileProcessed.current) {
      initialFileProcessed.current = true;
      loadFile(initialFile);
    }
  }, [initialFile, loadFile]);

  const onCropComplete = useCallback((_: Area, croppedPixels: Area) => {
    setCroppedAreaPixels(croppedPixels);
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    loadFile(file);
  };

  const handleUpload = async () => {
    if (!imageSrc) return;
    if (!isFreeUpload && !croppedAreaPixels) return;

    const cleanLabel = normalizeAssetLabel(label);
    if (spec.requireLabel && !cleanLabel) {
      toast.error(`Label requis pour une image ${spec.displayName}`);
      return;
    }
    if (sourceDims) {
      const dimError = validateSourceDimensions(sourceDims.width, sourceDims.height, spec);
      if (dimError) {
        toast.error(dimError);
        return;
      }
    }

    setUploading(true);

    try {
      // Upload libre : image d'origine telle quelle. Sinon crop client-side (WYSIWYG)
      const finalBase64 = isFreeUpload
        ? imageSrc
        : await getCroppedImg(
            imageSrc,
            croppedAreaPixels as Area,
            effTargetWidth,
            effTargetHeight
          );

      const res = await fetch("/api/assets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image: finalBase64,
          label: cleanLabel,
          week: week ? Number(week) : null,
          year: year ? Number(year) : null,
          type: selectedType,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        toast.error(data?.error ?? "Erreur lors de l'upload");
        return;
      }

      const asset = await res.json();
      toast.success("Image uploadée");
      onUploaded(asset.url);
    } catch {
      toast.error("Erreur lors de l'upload");
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files?.[0];
      if (!file) return;
      loadFile(file);
    },
    [loadFile]
  );

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Uploader une image</DialogTitle>
        </DialogHeader>

        {allowTypeSelect && !imageSrc && (
          <div className="space-y-1.5">
            <Label htmlFor="asset-type">Type d&apos;image</Label>
            <select
              id="asset-type"
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value as AssetType)}
              className="h-10 w-full rounded-md border border-input bg-transparent px-3 text-sm outline-none"
            >
              {(Object.keys(ASSET_SPECS) as AssetType[]).map((type) => (
                <option key={type} value={type}>
                  {ASSET_SPECS[type].displayName}
                </option>
              ))}
            </select>
          </div>
        )}

        {!imageSrc ? (
          <div
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            onClick={() => fileInputRef.current?.click()}
            className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-12 transition-colors hover:border-primary/50"
          >
            <Upload className="mb-2 h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground text-center">
              Glissez une image ou cliquez pour sélectionner
            </p>
            <p className="mt-1.5 text-xs text-muted-foreground/60 text-center">
              {ACCEPTED_FORMATS_LABEL} · max {formatBytes(MAX_SOURCE_BYTES)}
              {effTargetWidth && effTargetHeight
                ? ` · min ${effTargetWidth}×${effTargetHeight} px`
                : ""}
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPTED_MIME_ATTR}
              className="hidden"
              onChange={handleFileChange}
            />
          </div>
        ) : (
          <div className="space-y-4">
            {isFreeUpload ? (
              <div className="relative max-h-80 w-full overflow-hidden rounded-lg bg-gray-100 flex items-center justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imageSrc}
                  alt="Aperçu"
                  className="max-h-80 w-auto max-w-full object-contain"
                />
              </div>
            ) : (
              <div className="relative h-80 w-full overflow-hidden rounded-lg bg-gray-100 flex items-center justify-center">
                <Cropper
                  image={imageSrc}
                  crop={crop}
                  zoom={zoom}
                  minZoom={minZoom}
                  cropShape={effCropShape}
                  aspect={effCropAspect}
                  objectFit="contain"
                  style={{
                    containerStyle: { background: "#eee" },
                    mediaStyle: {},
                    cropAreaStyle:
                      effCropShape === "rect"
                        ? { border: "2px solid rgba(59, 130, 246, 0.8)", boxShadow: "0 0 0 9999px rgba(0, 0, 0, 0.4)" }
                        : {},
                  }}
                  onCropChange={setCrop}
                  onZoomChange={setZoom}
                  onCropComplete={onCropComplete}
                />
              </div>
            )}

            <p className="text-xs text-muted-foreground/60">
              {isFreeUpload
                ? `Sortie : image d'origine conservée${sourceDims ? ` (${sourceDims.width}×${sourceDims.height} px)` : ""} · format d'origine, poids optimisé`
                : `Sortie : ${
                    effTargetWidth && effTargetHeight
                      ? `${effTargetWidth}×${effTargetHeight} px`
                      : "dimensions libres"
                  } · ${spec.outputFormat === "jpeg" ? "JPEG" : "PNG"}`}
            </p>

            {!isFreeUpload && (
              <div className="flex items-center gap-2">
                <Label className="text-xs text-muted-foreground w-12">Zoom</Label>
                <input
                  type="range"
                  min={minZoom}
                  max={3}
                  step={0.01}
                  value={zoom}
                  onChange={(e) => setZoom(Number(e.target.value))}
                  className="flex-1"
                />
              </div>
            )}

            {!defaultLabel && (
              <div className="space-y-1.5">
                <Label htmlFor="asset-label">
                  Label{spec.requireLabel ? " *" : ""}
                </Label>
                <Input
                  id="asset-label"
                  placeholder="Ex: promo été, logo marque..."
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                />
              </div>
            )}

            {defaultWeek == null && defaultYear == null && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="asset-year">Année</Label>
                  <Input
                    id="asset-year"
                    type="number"
                    placeholder="Ex: 2026"
                    value={year}
                    onChange={(e) => setYear(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="asset-week">Semaine</Label>
                  <Input
                    id="asset-week"
                    type="number"
                    min={1}
                    max={53}
                    placeholder="Ex: 17"
                    value={week}
                    onChange={(e) => setWeek(e.target.value)}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Annuler
          </Button>
          {imageSrc && (
            <Button
              onClick={handleUpload}
              disabled={uploading || (spec.requireLabel && !normalizeAssetLabel(label))}
            >
              {uploading && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
              Uploader
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
