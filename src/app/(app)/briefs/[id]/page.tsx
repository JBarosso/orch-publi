"use client";

import { useEffect, useState, useCallback, useRef, use } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save, FileCode, Loader2, ChevronDown, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Panel, Group as PanelGroup, Separator as PanelResizeHandle } from "react-resizable-panels";
import type { Brief, BriefSection, MacaronItem, MacaronsContent } from "@/types";
import type { BriefStatus } from "@/types";
import { MacaronsEditor } from "@/templates/macarons/editor";
import { MacaronsPreview } from "@/templates/macarons/preview";
import { StatusActions } from "@/components/editor/status-actions";
import { StatusBadge } from "@/components/briefs/status-badge";
import { MediaLibraryDialog } from "@/components/media/media-library-dialog";
import { ImageUploadDialog } from "@/components/media/image-upload-dialog";

interface BriefWithSections extends Brief {
  sections: BriefSection[];
}

export default function BriefEditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [brief, setBrief] = useState<BriefWithSections | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [macaronItems, setMacaronItems] = useState<MacaronItem[]>([]);
  const [macaronSectionId, setMacaronSectionId] = useState<string | null>(null);
  const [mediaTarget, setMediaTarget] = useState<string | null>(null);
  const [showUpload, setShowUpload] = useState(false);
  const [droppedFile, setDroppedFile] = useState<File | undefined>(undefined);
  const [dirty, setDirty] = useState(false);
  const [pendingNav, setPendingNav] = useState<string | null>(null);
  const savedItemsRef = useRef<string>("");
  const [macaronsOpen, setMacaronsOpen] = useState(true);
  const [macaronsPreview, setMacaronsPreview] = useState(true);

  const fetchBrief = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/briefs/${id}`);
    if (!res.ok) {
      toast.error("Brief introuvable");
      router.push("/");
      return;
    }
    const data: BriefWithSections = await res.json();
    setBrief(data);

    const macaronSection = data.sections.find((s) => s.type === "macarons");
    if (macaronSection) {
      setMacaronSectionId(macaronSection.id);
      const content = macaronSection.content as MacaronsContent;
      const items = content?.items ?? [];
      setMacaronItems(items);
      savedItemsRef.current = JSON.stringify(items);
      setDirty(false);
    }
    setLoading(false);
  }, [id, router]);

  useEffect(() => {
    fetchBrief();
  }, [fetchBrief]);

  const handleMacaronChange = useCallback(
    (items: MacaronItem[]) => {
      setMacaronItems(items);
      setDirty(JSON.stringify(items) !== savedItemsRef.current);
    },
    [],
  );

  const handleSave = useCallback(async () => {
    if (!macaronSectionId) return;
    setSaving(true);
    try {
      await fetch("/api/sections", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: macaronSectionId,
          content: { items: macaronItems },
        }),
      });
      savedItemsRef.current = JSON.stringify(macaronItems);
      setDirty(false);
      toast.success("Sauvegardé");
    } catch {
      toast.error("Erreur lors de la sauvegarde");
    } finally {
      setSaving(false);
    }
  }, [macaronSectionId, macaronItems]);

  // Ctrl+S shortcut
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

  // Browser beforeunload (tab close, refresh, external navigation)
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (dirty) {
        e.preventDefault();
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  const navigateWithGuard = (href: string) => {
    if (dirty) {
      setPendingNav(href);
    } else {
      router.push(href);
    }
  };

  const confirmNav = () => {
    if (pendingNav) {
      setDirty(false);
      router.push(pendingNav);
      setPendingNav(null);
    }
  };

  const saveAndContinue = async () => {
    await handleSave();
    if (pendingNav) {
      router.push(pendingNav);
      setPendingNav(null);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (dirty) {
      toast.error("Sauvegardez vos modifications avant de changer le statut");
      return;
    }
    await fetch(`/api/briefs/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    fetchBrief();
    toast.success("Statut mis à jour");
  };

  const handleImageSelected = (url: string) => {
    if (!mediaTarget) return;
    setMacaronItems((prev) => {
      const next = prev.map((item) =>
        item.id === mediaTarget ? { ...item, imageUrl: url } : item,
      );
      setDirty(JSON.stringify(next) !== savedItemsRef.current);
      return next;
    });
    setMediaTarget(null);
  };

  if (loading || !brief) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Unsaved changes confirmation dialog */}
      <Dialog open={!!pendingNav} onOpenChange={() => setPendingNav(null)}>
        <DialogContent className="w-fit max-w-[calc(100%-2rem)] sm:max-w-fit">
          <DialogHeader>
            <DialogTitle>Modifications non sauvegardées</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Vous avez des modifications en cours. Si vous quittez cette page, vos changements seront perdus.
          </p>
          <DialogFooter className="sm:flex-wrap">
            <Button variant="outline" onClick={() => setPendingNav(null)}>
              Annuler
            </Button>
            <Button variant="destructive" onClick={confirmNav}>
              Quitter sans sauvegarder
            </Button>
            <Button onClick={saveAndContinue} disabled={saving}>
              {saving && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
              Sauvegarder et continuer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <header className="flex items-center justify-between border-b border-border/60 bg-card px-5 py-3">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => navigateWithGuard("/")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-3">
            <h1 className="text-[15px] font-semibold">{brief.slug}</h1>
            <StatusBadge status={brief.status as BriefStatus} />
            {dirty && (
              <span className="rounded-md bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-medium text-amber-600">
                Non sauvegardé
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <StatusActions status={brief.status} onChange={handleStatusChange} />
          <Button
            variant="outline"
            size="sm"
            className="rounded-lg"
            onClick={() => navigateWithGuard(`/briefs/${id}/export`)}
          >
            <FileCode className="mr-1.5 h-3.5 w-3.5" />
            Exporter
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving} className="rounded-lg shadow-sm shadow-primary/20">
            {saving ? (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            ) : (
              <Save className="mr-1.5 h-3.5 w-3.5" />
            )}
            Sauvegarder
          </Button>
        </div>
      </header>

      <PanelGroup orientation="horizontal" className="flex-1">
        <Panel defaultSize={50} minSize={25}>
          <div className="h-full overflow-y-auto p-6">
            <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
              Éditeur
            </h2>
            <div className="space-y-3">
              <div className="rounded-lg border border-border/60 bg-card shadow-sm">
                <button
                  type="button"
                  onClick={() => setMacaronsOpen((v) => !v)}
                  className="flex w-full items-center justify-between px-4 py-3 text-sm font-semibold transition-colors hover:bg-muted/50"
                >
                  <span>Macarons</span>
                  <div className="flex items-center gap-1">
                    <span
                      onClick={(e) => {
                        e.stopPropagation();
                        setMacaronsPreview((v) => !v);
                      }}
                      className="inline-flex rounded p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                      title={macaronsPreview ? "Masquer l'aperçu" : "Afficher l'aperçu"}
                    >
                      {macaronsPreview ? (
                        <Eye className="h-3.5 w-3.5" />
                      ) : (
                        <EyeOff className="h-3.5 w-3.5" />
                      )}
                    </span>
                    <ChevronDown
                      className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${macaronsOpen ? "rotate-0" : "-rotate-90"}`}
                    />
                  </div>
                </button>
                {macaronsOpen && (
                  <div className="border-t border-border/60 px-4 py-4">
                    <MacaronsEditor
                      items={macaronItems}
                      briefWeek={brief.week}
                      briefYear={brief.year}
                      briefLocale={brief.locale}
                      onChange={handleMacaronChange}
                      onOpenMediaLibrary={(itemId) => setMediaTarget(itemId)}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        </Panel>

        <PanelResizeHandle className="group relative flex w-2 items-center justify-center bg-border/30 transition-colors hover:bg-primary/20 data-resize-handle-active:bg-primary/30">
          <div className="h-8 w-1 rounded-full bg-border/60 transition-colors group-hover:bg-primary/40 group-data-resize-handle-active:bg-primary/60" />
        </PanelResizeHandle>

        <Panel defaultSize={50} minSize={25}>
          <div className="h-full overflow-y-auto p-6">
            <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
              Aperçu
            </h2>
            <div className="space-y-3">
              {macaronsPreview && <MacaronsPreview items={macaronItems} />}
            </div>
          </div>
        </Panel>
      </PanelGroup>

      {mediaTarget && (
        <MediaLibraryDialog
          onSelect={handleImageSelected}
          onClose={() => setMediaTarget(null)}
          onUploadNew={(file) => {
            setDroppedFile(file);
            setShowUpload(true);
          }}
        />
      )}

      {showUpload && (
        <ImageUploadDialog
          defaultLabel={macaronItems.find((i) => i.id === mediaTarget)?.label.replace(/\n/g, " ")}
          defaultWeek={brief.week}
          defaultYear={brief.year}
          initialFile={droppedFile}
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
