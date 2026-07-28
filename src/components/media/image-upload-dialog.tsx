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
  ACCEPTED_VIDEO_FORMATS_LABEL,
  ACCEPTED_VIDEO_MIME_ATTR,
  ASSET_SPECS,
  MAX_SOURCE_BYTES,
  MAX_VIDEO_SOURCE_BYTES,
  formatBytes,
  looksLikeMp4,
  looksLikeTiff,
  normalizeAssetLabel,
  validateSourceFile,
  validateSourceVideoFile,
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
  /** Fichier brut dès sa sélection (mode vidéo) — utile pour un traitement
   * client-side en parallèle de l'upload (ex: capture de la 1ère frame). */
  onFileSelected?: (file: File) => void;
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
  onFileSelected,
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
  const [convertingTiff, setConvertingTiff] = useState(false);
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
  const isVideo = spec.kind === "video";
  // Recadrage à sauter dans les deux cas : upload libre ou vidéo (jamais de crop vidéo)
  const skipCrop = isFreeUpload || isVideo;

  // Allow zoom out so image can be smaller than container
  const minZoom = 0.3;

  const loadFile = useCallback(
    (file: File) => {
      // Sélecteur de type générique (médiathèque) : si le fichier déposé est
      // une vidéo et qu'aucun type vidéo n'est déjà sélectionné, bascule sur
      // un type vidéo par défaut — évite d'avoir à choisir le type avant.
      // Si un type vidéo spécifique était déjà sélectionné (ex: "Slider -
      // Vidéo"), on le respecte plutôt que d'écraser vers un autre.
      // Windows ne rapporte pas toujours file.type pour les .mp4 (souvent
      // vide) : on se fie aussi à l'extension via looksLikeMp4.
      const isVideoFile = file.type.startsWith("video/") || looksLikeMp4(file);
      if (isVideoFile && allowTypeSelect && spec.kind !== "video") {
        setSelectedType("mea_v2_video");
      }
      const activeSpec =
        isVideoFile && allowTypeSelect ? (spec.kind === "video" ? spec : ASSET_SPECS.mea_v2_video) : spec;

      if (activeSpec.kind === "video") {
        const videoError = validateSourceVideoFile(file);
        if (videoError) {
          toast.error(videoError);
          return;
        }
        onFileSelected?.(file);
        const reader = new FileReader();
        reader.onload = () => {
          // file.type (donc le préfixe mime de reader.result) peut être vide
          // ou erroné sur Windows — on force explicitement "video/mp4" plutôt
          // que de faire confiance au navigateur (sinon le serveur rejette le
          // préfixe mime au moment du décodage base64).
          const result = reader.result as string;
          const base64 = result.slice(result.indexOf(",") + 1);
          setSourceDims(null);
          setImageSrc(`data:video/mp4;base64,${base64}`);
        };
        reader.readAsDataURL(file);
        return;
      }

      const fileError = validateSourceFile(file);
      if (fileError) {
        toast.error(fileError);
        return;
      }
      const isTiff = looksLikeTiff(file);
      const reader = new FileReader();
      reader.onload = async () => {
        let src = reader.result as string;

        // Aucun navigateur ne sait décoder le TIFF (ni <img>, ni canvas) : on
        // le convertit en PNG côté serveur avant de poursuivre le flux
        // habituel, qui n'a alors plus besoin de savoir que la source était
        // un TIFF.
        if (isTiff) {
          setConvertingTiff(true);
          try {
            const res = await fetch("/api/assets/convert-tiff", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ image: src }),
            });
            const data = await res.json().catch(() => null);
            if (!res.ok) {
              toast.error(data?.error ?? "Impossible de convertir ce fichier TIFF");
              return;
            }
            src = data.image;
          } catch {
            toast.error("Erreur lors de la conversion du fichier TIFF");
            return;
          } finally {
            setConvertingTiff(false);
          }
        }

        const img = new Image();
        img.onload = () => {
          // Pas de blocage sur une image plus petite que la taille conseillée :
          // le crop (fond blanc) puis le serveur (fit "contain" + fond blanc)
          // gèrent déjà ce cas.
          setSourceDims({ width: img.width, height: img.height });
          setImageSrc(src);
        };
        img.onerror = () => toast.error("Impossible de lire cette image.");
        img.src = src;
      };
      reader.readAsDataURL(file);
    },
    [spec, selectedType, allowTypeSelect, onFileSelected]
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
    if (!skipCrop && !croppedAreaPixels) return;

    const cleanLabel = normalizeAssetLabel(label);
    if (spec.requireLabel && !cleanLabel) {
      toast.error(`Label requis pour une image ${spec.displayName}`);
      return;
    }
    setUploading(true);

    try {
      // Upload libre ou vidéo : fichier d'origine tel quel. Sinon crop client-side (WYSIWYG)
      const finalBase64 = skipCrop
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
      toast.success(isVideo ? "Vidéo uploadée" : "Image uploadée");
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

        {convertingTiff ? (
          <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-12">
            <Loader2 className="mb-2 h-8 w-8 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground text-center">Conversion du fichier TIFF…</p>
          </div>
        ) : !imageSrc ? (
          <div
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            onClick={() => fileInputRef.current?.click()}
            className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-12 transition-colors hover:border-primary/50"
          >
            <Upload className="mb-2 h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground text-center">
              {isVideo
                ? "Glissez une vidéo ou cliquez pour sélectionner"
                : "Glissez une image ou cliquez pour sélectionner"}
            </p>
            <p className="mt-1.5 text-xs text-muted-foreground/60 text-center">
              {isVideo
                ? `${ACCEPTED_VIDEO_FORMATS_LABEL} · max ${formatBytes(MAX_VIDEO_SOURCE_BYTES)}`
                : `${ACCEPTED_FORMATS_LABEL} · max ${formatBytes(MAX_SOURCE_BYTES)}${
                    effTargetWidth && effTargetHeight
                      ? ` · conseillé ${effTargetWidth}×${effTargetHeight} px (les images plus petites sont complétées en blanc)`
                      : ""
                  }`}
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept={isVideo ? ACCEPTED_VIDEO_MIME_ATTR : ACCEPTED_MIME_ATTR}
              className="hidden"
              onChange={handleFileChange}
            />
          </div>
        ) : (
          <div className="space-y-4">
            {isVideo ? (
              <div className="relative max-h-80 w-full overflow-hidden rounded-lg bg-black flex items-center justify-center">
                <video
                  src={imageSrc}
                  controls
                  className="max-h-80 w-auto max-w-full"
                />
              </div>
            ) : isFreeUpload ? (
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
              {isVideo
                ? "Sortie : vidéo MP4 d'origine conservée telle quelle"
                : isFreeUpload
                ? `Sortie : image d'origine conservée${sourceDims ? ` (${sourceDims.width}×${sourceDims.height} px)` : ""} · format d'origine, poids optimisé`
                : `Sortie : ${
                    effTargetWidth && effTargetHeight
                      ? `${effTargetWidth}×${effTargetHeight} px`
                      : "dimensions libres"
                  } · ${spec.outputFormat === "jpeg" ? "JPEG" : "PNG"}`}
            </p>

            {!skipCrop && (
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
