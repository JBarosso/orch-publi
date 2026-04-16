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

interface ImageUploadDialogProps {
  defaultLabel?: string;
  defaultWeek?: number;
  defaultYear?: number;
  assetType?: AssetType;
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
  initialFile,
  cropShape = "round",
  cropAspect = 1,
  targetWidth,
  targetHeight,
  onUploaded,
  onClose,
}: ImageUploadDialogProps) {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [label, setLabel] = useState(defaultLabel ?? "");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const initialFileProcessed = useRef(false);

  // Allow zoom out so image can be smaller than container
  const minZoom = 0.3;

  useEffect(() => {
    if (initialFile && !initialFileProcessed.current) {
      initialFileProcessed.current = true;
      const reader = new FileReader();
      reader.onload = () => setImageSrc(reader.result as string);
      reader.readAsDataURL(initialFile);
    }
  }, [initialFile]);

  const onCropComplete = useCallback((_: Area, croppedPixels: Area) => {
    setCroppedAreaPixels(croppedPixels);
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setImageSrc(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleUpload = async () => {
    if (!imageSrc || !croppedAreaPixels) return;
    setUploading(true);

    try {
      // Do the crop client-side to guarantee WYSIWYG
      const finalBase64 = await getCroppedImg(
        imageSrc,
        croppedAreaPixels,
        targetWidth,
        targetHeight
      );

      const res = await fetch("/api/assets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image: finalBase64,
          label: label.trim(),
          week: defaultWeek,
          year: defaultYear,
          type: assetType,
          targetWidth,
          targetHeight,
        }),
      });

      if (!res.ok) {
        toast.error("Erreur lors de l'upload");
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

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file || !file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = () => setImageSrc(reader.result as string);
    reader.readAsDataURL(file);
  }, []);

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Uploader une image</DialogTitle>
        </DialogHeader>

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
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="relative h-80 w-full overflow-hidden rounded-lg bg-gray-100 flex items-center justify-center">
              <Cropper
                image={imageSrc}
                crop={crop}
                zoom={zoom}
                minZoom={minZoom}
                cropShape={cropShape}
                aspect={cropAspect}
                objectFit="contain"
                style={{
                  containerStyle: { background: "#eee" },
                  mediaStyle: {},
                  cropAreaStyle:
                    cropShape === "rect"
                      ? { border: "2px solid rgba(59, 130, 246, 0.8)", boxShadow: "0 0 0 9999px rgba(0, 0, 0, 0.4)" }
                      : {},
                }}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
              />
            </div>

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

            {!defaultLabel && (
              <div className="space-y-1.5">
                <Label htmlFor="asset-label">Label</Label>
                <Input
                  id="asset-label"
                  placeholder="Ex: promo été, logo marque..."
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                />
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Annuler
          </Button>
          {imageSrc && (
            <Button onClick={handleUpload} disabled={uploading}>
              {uploading && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
              Uploader
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
