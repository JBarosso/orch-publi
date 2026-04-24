"use client";

import { useEffect, useState, useCallback, useRef, use } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save, FileCode, Loader2, ChevronDown, Eye, EyeOff, Plus, Copy, Trash2, Monitor, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  Panel,
  Group as PanelGroup,
  Separator as PanelResizeHandle,
  useGroupRef,
} from "react-resizable-panels";
import type { Brief, BriefSection, MacaronItem, MacaronsContent } from "@/types";
import type { BriefStatus } from "@/types";
import { MacaronsEditor } from "@/templates/macarons/editor";
import { MacaronsPreview } from "@/templates/macarons/preview";
import { MeaEditor } from "@/templates/mea/editor";
import { MeaPreview } from "@/templates/mea/preview";
import type { MeaItem, MeaContent } from "@/types";
import { StatusActions } from "@/components/editor/status-actions";
import { StatusBadge } from "@/components/briefs/status-badge";
import { MediaLibraryDialog } from "@/components/media/media-library-dialog";
import { ImageUploadDialog } from "@/components/media/image-upload-dialog";
import type { AssetType } from "@/types";

interface BriefWithSections extends Brief {
  sections: BriefSection[];
}

function isMacaronItem(item: MacaronItem | MeaItem): item is MacaronItem {
  return "label" in item;
}

function isMeaItem(item: MacaronItem | MeaItem): item is MeaItem {
  return "title" in item;
}

export default function BriefEditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [brief, setBrief] = useState<BriefWithSections | null>(null);
  const [sections, setSections] = useState<BriefSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [mediaTarget, setMediaTarget] = useState<{
    sectionId: string;
    itemId: string;
    type: AssetType;
  } | null>(null);
  const [showUpload, setShowUpload] = useState(false);
  const [droppedFile, setDroppedFile] = useState<File | undefined>(undefined);
  const [uploadAssetType, setUploadAssetType] = useState<AssetType>("other");
  const [dirty, setDirty] = useState(false);
  const [pendingNav, setPendingNav] = useState<string | null>(null);
  const savedSectionsRef = useRef<string>("");
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});
  const [previewSections, setPreviewSections] = useState<Record<string, boolean>>({});
  const [createOpen, setCreateOpen] = useState(false);
  const [newSectionType, setNewSectionType] = useState<"macarons" | "mea">("macarons");
  const [pendingDeleteSectionId, setPendingDeleteSectionId] = useState<string | null>(null);
  const panelGroupContainerRef = useRef<HTMLDivElement | null>(null);
  const previewGroupRef = useGroupRef();

  const serializeSections = useCallback((list: BriefSection[]) => {
    return JSON.stringify(
      list.map((s) => ({
        id: s.id,
        type: s.type,
        title: s.title,
        order: s.order,
        visible: s.visible,
        content: s.content,
      })),
    );
  }, []);

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
    setSections(data.sections);
    savedSectionsRef.current = serializeSections(data.sections);
    setOpenSections((prev) => {
      const next = { ...prev };
      for (const section of data.sections) {
        if (next[section.id] === undefined) next[section.id] = true;
      }
      return next;
    });
    setPreviewSections((prev) => {
      const next = { ...prev };
      for (const section of data.sections) {
        if (next[section.id] === undefined) next[section.id] = true;
      }
      return next;
    });

    setDirty(false);
    setLoading(false);
  }, [id, router, serializeSections]);

  useEffect(() => {
    fetchBrief();
  }, [fetchBrief]);

  const updateSection = useCallback(
    (sectionId: string, updates: Partial<BriefSection>) => {
      setSections((prev) => {
        const next = prev.map((section) =>
          section.id === sectionId ? { ...section, ...updates } : section,
        );
        setDirty(serializeSections(next) !== savedSectionsRef.current);
        return next;
      });
    },
    [serializeSections],
  );

  const updateSectionItems = useCallback(
    (sectionId: string, items: MacaronItem[] | MeaItem[]) => {
      updateSection(sectionId, { content: { items } });
    },
    [updateSection],
  );

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      await Promise.all(
        sections.map((section) =>
          fetch("/api/sections", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              id: section.id,
              content: section.content,
              title: section.title,
              visible: section.visible,
              order: section.order,
            }),
          }),
        ),
      );
      savedSectionsRef.current = serializeSections(sections);
      setDirty(false);
      toast.success("Sauvegardé");
    } catch {
      toast.error("Erreur lors de la sauvegarde");
    } finally {
      setSaving(false);
    }
  }, [sections, serializeSections]);

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

  const handleImageSelected = useCallback((url: string) => {
    if (!mediaTarget) return;

    const target = mediaTarget;
    setSections((prev) => {
      const next = prev.map((section) => {
        if (section.id !== target.sectionId) return section;
        const content = section.content as { items?: (MacaronItem | MeaItem)[] };
        const items = (content.items ?? []).map((item) =>
          item.id === target.itemId ? { ...item, imageUrl: url } : item,
        );
        return { ...section, content: { items } };
      });
      setDirty(serializeSections(next) !== savedSectionsRef.current);
      return next;
    });

    setMediaTarget(null);
  }, [mediaTarget, serializeSections]);

  const createSection = async () => {
    if (!brief) return;
    if (dirty) {
      toast.error("Sauvegardez d'abord vos modifications avant de créer une section");
      return;
    }
    const res = await fetch("/api/sections", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ briefId: brief.id, type: newSectionType }),
    });
    if (!res.ok) {
      toast.error("Impossible de créer la section");
      return;
    }
    setCreateOpen(false);
    await fetchBrief();
    toast.success("Section créée");
  };

  const duplicateSection = async (sectionId: string) => {
    if (dirty) {
      toast.error("Sauvegardez d'abord vos modifications avant de dupliquer une section");
      return;
    }
    const res = await fetch("/api/sections", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sourceSectionId: sectionId }),
    });
    if (!res.ok) {
      toast.error("Impossible de dupliquer la section");
      return;
    }
    await fetchBrief();
    toast.success("Section dupliquée");
  };

  const deleteSection = async () => {
    if (!pendingDeleteSectionId) return;
    if (dirty) {
      toast.error("Sauvegardez d'abord vos modifications avant de supprimer une section");
      return;
    }
    const res = await fetch("/api/sections", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: pendingDeleteSectionId }),
    });
    if (!res.ok) {
      toast.error("Impossible de supprimer la section");
      return;
    }
    setPendingDeleteSectionId(null);
    await fetchBrief();
    toast.success("Section supprimée");
  };

  const setPreviewPanelWidth = useCallback((targetPx: number) => {
    const containerWidth = panelGroupContainerRef.current?.clientWidth;
    if (!containerWidth || !previewGroupRef.current) return;
    const rightPercent = (targetPx / containerWidth) * 100;
    const clampedRight = Math.max(25, Math.min(100, rightPercent));
    const leftPercent = 100 - clampedRight;
    previewGroupRef.current.setLayout({
      editor: leftPercent,
      preview: clampedRight,
    });
  }, []);

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
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Créer une section</DialogTitle>
            <DialogDescription>
              Choisissez le type de section à ajouter.
            </DialogDescription>
          </DialogHeader>
          <Select
            value={newSectionType}
            onValueChange={(v) => setNewSectionType(v as "macarons" | "mea")}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="macarons">Macaron</SelectItem>
              <SelectItem value="mea">MEA</SelectItem>
            </SelectContent>
          </Select>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Annuler
            </Button>
            <Button onClick={createSection}>Créer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={!!pendingDeleteSectionId} onOpenChange={() => setPendingDeleteSectionId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Supprimer cette section ?</DialogTitle>
            <DialogDescription>
              Cette action est irreversible.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPendingDeleteSectionId(null)}>
              Annuler
            </Button>
            <Button variant="destructive" onClick={deleteSection}>
              Supprimer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <header className="flex items-center justify-between border-b border-border/60 bg-card px-5 py-3 flex-wrap gap-4">
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

      <div ref={panelGroupContainerRef} className="flex-1">
      <PanelGroup groupRef={previewGroupRef} orientation="horizontal" className="h-[95svh!important]">
        <Panel id="editor" defaultSize={50} minSize={25}>
          <div className="h-full overflow-y-auto p-6">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
                Éditeur
              </h2>
              <Button
                size="sm"
                className="bg-primary text-primary-foreground hover:bg-primary/90"
                onClick={() => setCreateOpen(true)}
              >
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                Créer une section
              </Button>
            </div>
            <div className="space-y-3">
              {sections.map((section) => (
                <div
                  key={section.id}
                  className="rounded-lg border border-border/60 bg-card shadow-sm"
                >
                  <button
                    type="button"
                    onClick={() =>
                      setOpenSections((prev) => ({
                        ...prev,
                        [section.id]: !prev[section.id],
                      }))
                    }
                    className="flex w-full items-center justify-between gap-3 px-4 py-3 text-sm font-semibold transition-colors hover:bg-muted/50"
                  >
                    <Input
                      value={section.title || section.type}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) =>
                        updateSection(section.id, { title: e.target.value })
                      }
                      className="h-8 w-full max-w-[320px]"
                    />
                    <div className="flex items-center gap-1">
                      <span
                        onClick={(e) => {
                          e.stopPropagation();
                          duplicateSection(section.id);
                        }}
                        className="inline-flex rounded p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                        title="Dupliquer la section"
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </span>
                      <span
                        onClick={(e) => {
                          e.stopPropagation();
                          setPendingDeleteSectionId(section.id);
                        }}
                        className="inline-flex rounded p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-destructive"
                        title="Supprimer la section"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </span>
                      <span
                        onClick={(e) => {
                          e.stopPropagation();
                          setPreviewSections((prev) => ({
                            ...prev,
                            [section.id]: !prev[section.id],
                          }));
                        }}
                        className="inline-flex rounded p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                        title={previewSections[section.id] ? "Masquer l'aperçu" : "Afficher l'aperçu"}
                      >
                        {previewSections[section.id] ? (
                          <Eye className="h-3.5 w-3.5" />
                        ) : (
                          <EyeOff className="h-3.5 w-3.5" />
                        )}
                      </span>
                      <ChevronDown
                        className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${openSections[section.id] ? "rotate-0" : "-rotate-90"}`}
                      />
                    </div>
                  </button>
                  {openSections[section.id] && (
                    <div className="border-t border-border/60 px-4 py-4">
                      {section.type === "macarons" ? (
                        <MacaronsEditor
                          items={((section.content as MacaronsContent)?.items ?? [])}
                          briefWeek={brief.week}
                          briefYear={brief.year}
                          briefLocale={brief.locale}
                          onChange={(items) => updateSectionItems(section.id, items)}
                          onOpenMediaLibrary={(itemId) =>
                            setMediaTarget({
                              sectionId: section.id,
                              itemId,
                              type: "macaron",
                            })
                          }
                        />
                      ) : section.type === "mea" ? (
                        <MeaEditor
                          items={((section.content as MeaContent)?.items ?? [])}
                          briefWeek={brief.week}
                          briefYear={brief.year}
                          briefLocale={brief.locale}
                          onChange={(items) => updateSectionItems(section.id, items)}
                          onOpenMediaLibrary={(itemId) =>
                            setMediaTarget({
                              sectionId: section.id,
                              itemId,
                              type: "mea",
                            })
                          }
                        />
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          Template "{section.type}" non pris en charge dans l'éditeur pour le moment.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </Panel>

        <PanelResizeHandle className="group relative flex w-2 items-center justify-center bg-border/30 transition-colors hover:bg-primary/20 data-resize-handle-active:bg-primary/30">
          <div className="h-8 w-1 rounded-full bg-border/60 transition-colors group-hover:bg-primary/40 group-data-resize-handle-active:bg-primary/60" />
        </PanelResizeHandle>

        <Panel id="preview" defaultSize={50} minSize={25}>
          <div className="h-full overflow-auto p-6">
            <div className="mb-4 flex items-center justify-between gap-3 sticky top-0">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
                Aperçu
              </h2>
              <div className="flex items-center gap-1.5">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8"
                  onClick={() => setPreviewPanelWidth(1488)}
                >
                  <Monitor className="mr-1.5 h-3.5 w-3.5" />
                  Desktop
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8"
                  onClick={() => setPreviewPanelWidth(423)}
                >
                  <Smartphone className="mr-1.5 h-3.5 w-3.5" />
                  Mobile
                </Button>
              </div>
            </div>
            <div className="space-y-3">
              {sections.map((section) => {
                if (!previewSections[section.id]) return null;
                if (section.type === "macarons") {
                  return (
                    <div key={section.id} className="space-y-1.5">
                      <p className="text-[11px] font-medium text-muted-foreground/80">
                        {section.title || "Section"}
                      </p>
                      <MacaronsPreview
                        items={((section.content as MacaronsContent)?.items ?? [])}
                      />
                    </div>
                  );
                }
                if (section.type === "mea") {
                  return (
                    <div key={section.id} className="space-y-1.5">
                      <p className="text-[11px] font-medium text-muted-foreground/80">
                        {section.title || "Section"}
                      </p>
                      <MeaPreview
                        items={((section.content as MeaContent)?.items ?? [])}
                      />
                    </div>
                  );
                }
                return null;
              })}
            </div>
          </div>
        </Panel>
      </PanelGroup>
      </div>

      {mediaTarget && (
        <MediaLibraryDialog
          onSelect={handleImageSelected}
          onClose={() => setMediaTarget(null)}
          initialType={mediaTarget.type}
          onUploadNew={(file, type) => {
            setDroppedFile(file);
            setUploadAssetType(type ?? mediaTarget.type);
            setShowUpload(true);
          }}
        />
      )}

      {showUpload && (() => {
        if (!mediaTarget) return null;
        const section = sections.find((s) => s.id === mediaTarget.sectionId);
        const items = ((section?.content as { items?: (MacaronItem | MeaItem)[] })?.items ?? []);
        const targetItem = items.find((i) => i.id === mediaTarget.itemId) as
          | MacaronItem
          | MeaItem
          | undefined;
        const isMeaTarget = mediaTarget.type === "mea";
        return (
          <ImageUploadDialog
            defaultLabel={
              (targetItem && isMacaronItem(targetItem)
                ? targetItem.label
                : undefined)?.replace(/\n/g, " ") ??
              (targetItem && isMeaItem(targetItem)
                ? targetItem.title
                : undefined)?.replace(/\n/g, " ")
            }
            defaultWeek={brief.week}
            defaultYear={brief.year}
            initialFile={droppedFile}
            cropShape={isMeaTarget ? "rect" : "round"}
            cropAspect={isMeaTarget ? 3 / 2 : 1}
            targetWidth={isMeaTarget ? 600 : undefined}
            targetHeight={isMeaTarget ? 400 : undefined}
            assetType={uploadAssetType}
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
        );
      })()}
    </div>
  );
}
