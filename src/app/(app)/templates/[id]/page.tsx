"use client";

import { useCallback, useEffect, useRef, useState, use } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type {
  CustomBlock,
  CustomContent,
  CustomTemplate,
  CustomTemplateStatus,
} from "@/types";
import { TEMPLATE_STATUS_CONFIG } from "@/types";
import { CustomEditor } from "@/templates/custom/editor";
import { CustomPreview } from "@/templates/custom/preview";
import { MediaLibraryDialog } from "@/components/media/media-library-dialog";
import { ImageUploadDialog } from "@/components/media/image-upload-dialog";

const STATUS_OPTIONS: CustomTemplateStatus[] = ["draft", "published", "archived"];

export default function TemplateEditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [status, setStatus] = useState<CustomTemplateStatus>("draft");
  const [content, setContent] = useState<CustomContent>({
    layout: "stack",
    comment: "",
    blocks: [],
  });
  const [dirty, setDirty] = useState(false);
  const savedRef = useRef("");
  const [mediaBlockId, setMediaBlockId] = useState<string | null>(null);
  const [showUpload, setShowUpload] = useState(false);
  const [droppedFile, setDroppedFile] = useState<File | undefined>(undefined);

  const serialize = useCallback(
    (n: string, s: CustomTemplateStatus, c: CustomContent) =>
      JSON.stringify({ n, s, layout: c.layout, blocks: c.blocks }),
    [],
  );

  useEffect(() => {
    (async () => {
      const res = await fetch(`/api/templates?id=${id}`);
      if (!res.ok) {
        toast.error("Template introuvable");
        router.push("/templates");
        return;
      }
      const data: CustomTemplate = await res.json();
      setName(data.name);
      setStatus(data.status);
      const c: CustomContent = {
        layout: data.layout,
        comment: "",
        blocks: (data.blocks ?? []) as CustomBlock[],
      };
      setContent(c);
      savedRef.current = serialize(data.name, data.status, c);
      setLoading(false);
    })();
  }, [id, router, serialize]);

  useEffect(() => {
    if (loading) return;
    setDirty(serialize(name, status, content) !== savedRef.current);
  }, [name, status, content, loading, serialize]);

  const handleSave = useCallback(async () => {
    if (!name.trim()) {
      toast.error("Le nom du template est requis");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/templates", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          name: name.trim(),
          status,
          layout: content.layout,
          blocks: content.blocks,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        toast.error(data?.error ?? "Erreur lors de la sauvegarde");
        return;
      }
      savedRef.current = serialize(name.trim(), status, content);
      setDirty(false);
      toast.success("Template sauvegardé");
    } finally {
      setSaving(false);
    }
  }, [id, name, status, content, serialize]);

  // Ctrl+S
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        handleSave();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleSave]);

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (dirty) e.preventDefault();
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  const handleImageSelected = useCallback(
    (url: string) => {
      if (!mediaBlockId) return;
      setContent((prev) => ({
        ...prev,
        blocks: prev.blocks.map((b) =>
          b.id === mediaBlockId ? { ...b, imageUrl: url } : b,
        ),
      }));
      setMediaBlockId(null);
    },
    [mediaBlockId],
  );

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const statusConfig = TEMPLATE_STATUS_CONFIG[status];

  return (
    <div className="flex h-full flex-col">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-border/60 bg-card px-5 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => router.push("/templates")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nom du template"
            className="h-8 w-64 font-semibold"
          />
          {dirty && (
            <span className="rounded-md bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-medium text-amber-600">
              Non sauvegardé
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Select
            value={status}
            items={Object.fromEntries(
              STATUS_OPTIONS.map((s) => [s, TEMPLATE_STATUS_CONFIG[s].label]),
            )}
            onValueChange={(v) => v && setStatus(v as CustomTemplateStatus)}
          >
            <SelectTrigger
              className={cn("h-8 w-36 text-xs", statusConfig.color)}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((s) => (
                <SelectItem key={s} value={s}>
                  {TEMPLATE_STATUS_CONFIG[s].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={saving}
            className="rounded-lg shadow-sm shadow-primary/20"
          >
            {saving ? (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            ) : (
              <Save className="mr-1.5 h-3.5 w-3.5" />
            )}
            Sauvegarder
          </Button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="grid gap-6 xl:grid-cols-2">
          <div>
            <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
              Blocs
            </h2>
            <CustomEditor
              content={content}
              onChange={setContent}
              onOpenMediaLibrary={(blockId) => setMediaBlockId(blockId)}
              showComment={false}
            />
          </div>
          <div>
            <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
              Aperçu
            </h2>
            <CustomPreview content={content} />
          </div>
        </div>
      </div>

      {mediaBlockId && !showUpload && (
        <MediaLibraryDialog
          onSelect={handleImageSelected}
          onClose={() => setMediaBlockId(null)}
          initialType="other"
          onUploadNew={(file) => {
            setDroppedFile(file);
            setShowUpload(true);
          }}
        />
      )}

      {showUpload && mediaBlockId && (
        <ImageUploadDialog
          initialFile={droppedFile}
          assetType="other"
          onUploaded={(url) => {
            handleImageSelected(url);
            setShowUpload(false);
            setDroppedFile(undefined);
          }}
          onClose={() => {
            setShowUpload(false);
            setDroppedFile(undefined);
          }}
        />
      )}
    </div>
  );
}
