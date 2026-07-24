"use client";

import { useEffect, useState, useCallback, useRef, use } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save, FileCode, Loader2, ChevronDown, Eye, EyeOff, Plus, Copy, LayoutTemplate, Trash2, Monitor, Smartphone, Pencil, Check, X } from "lucide-react";
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
import { Switch } from "@/components/ui/switch";
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
import { MacaronsV2Preview } from "@/templates/macarons-v2/preview";
import { MeaEditor } from "@/templates/mea/editor";
import { MeaPreview } from "@/templates/mea/preview";
import { MeaV2Editor } from "@/templates/mea-v2/editor";
import { MeaV2Preview } from "@/templates/mea-v2/preview";
import { ArianeEditor } from "@/templates/ariane/editor";
import { ArianePreview } from "@/templates/ariane/preview";
import { EditoEditor } from "@/templates/edito/editor";
import { EditoPreview } from "@/templates/edito/preview";
import { CarouselEditor } from "@/templates/carousel/editor";
import { CarouselPreview } from "@/templates/carousel/preview";
import { GlobalHeaderEditor } from "@/templates/global-header/editor";
import { GlobalHeaderPreview } from "@/templates/global-header/preview";
import { CustomEditor } from "@/templates/custom/editor";
import { CustomPreview } from "@/templates/custom/preview";
import { normalizeCustomContent } from "@/templates/custom/schema";
import type {
  MeaItem,
  MeaContent,
  MeaV2Content,
  ArianeContent,
  EditoCard,
  EditoContent,
  CarouselContent,
  GlobalHeaderContent,
  CustomTemplate,
} from "@/types";
import { StatusActions } from "@/components/editor/status-actions";
import { StatusBadge } from "@/components/briefs/status-badge";
import { MediaLibraryDialog } from "@/components/media/media-library-dialog";
import { ImageUploadDialog } from "@/components/media/image-upload-dialog";
import { captureVideoFirstFrame, dataUrlToFile } from "@/lib/capture-video-frame";
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
  // Drop direct sur un bouton d'image (saute la médiathèque) : distingue ce
  // cas du clic normal (ouvre la médiathèque) pour qu'annuler le popin de
  // recadrage ne fasse pas apparaître une médiathèque jamais demandée.
  const [directDropUpload, setDirectDropUpload] = useState(false);
  const [uploadAssetType, setUploadAssetType] = useState<AssetType>("other");
  // Carte focus MEA v2 : upload vidéo dédié (pas de médiathèque, direct à l'upload),
  // avec chaînage vers l'upload de la vignette pré-remplie par la 1ère frame capturée
  const [videoUploadSectionId, setVideoUploadSectionId] = useState<string | null>(null);
  const [capturedPosterFile, setCapturedPosterFile] = useState<File | null>(null);
  // Carousel : même principe que MEA v2 ci-dessus, mais 2 diapositives
  // possibles donc on garde aussi l'index de la diapositive ciblée.
  const [carouselVideoTarget, setCarouselVideoTarget] = useState<{
    sectionId: string;
    slideIndex: number;
  } | null>(null);
  const [carouselCapturedPosterFile, setCarouselCapturedPosterFile] = useState<File | null>(null);
  const [dirty, setDirty] = useState(false);
  const [pendingNav, setPendingNav] = useState<string | null>(null);
  const savedSectionsRef = useRef<string>("");
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});
  const [previewSections, setPreviewSections] = useState<Record<string, boolean>>({});
  const [createOpen, setCreateOpen] = useState(false);
  // "macarons" | "mea" | "custom" (vierge) | "tpl:<id>" (depuis un template publié)
  const [newSectionType, setNewSectionType] = useState<string>("macarons");
  const [publishedTemplates, setPublishedTemplates] = useState<CustomTemplate[]>([]);
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
    (sectionId: string, items: MacaronItem[] | MeaItem[] | EditoCard[]) => {
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

  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState("");

  const handleRenameSubmit = async () => {
    const nextName = nameValue.trim();
    setEditingName(false);
    if (!brief || nextName === brief.name) return;
    await fetch(`/api/briefs/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: nextName }),
    });
    fetchBrief();
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

  const handleDirectDrop = useCallback(
    (target: { sectionId: string; itemId: string; type: AssetType }, file: File) => {
      setMediaTarget(target);
      setDroppedFile(file);
      setUploadAssetType(target.type);
      setShowUpload(true);
      setDirectDropUpload(true);
    },
    [],
  );

  const handleImageSelected = useCallback((url: string) => {
    if (!mediaTarget) return;

    const target = mediaTarget;
    setSections((prev) => {
      const next = prev.map((section) => {
        if (section.id !== target.sectionId) return section;
        if (section.type === "custom") {
          const content = normalizeCustomContent(section.content);
          return {
            ...section,
            content: {
              ...content,
              // Nouvelle image = nouveau fichier pour la semaine courante :
              // on redevient natif (imageWeek redevient dynamique).
              blocks: content.blocks.map((block) =>
                block.id === target.itemId ? { ...block, imageUrl: url, imageWeek: null } : block,
              ),
            },
          };
        }
        if (section.type === "mea_v2") {
          const content = section.content as MeaV2Content;
          if (target.itemId === "focus") {
            return {
              ...section,
              content: { ...content, focus: { ...content.focus, imageUrl: url, imageWeek: null } },
            };
          }
          const cardMatch = /^card-(\d+)$/.exec(target.itemId);
          if (cardMatch) {
            const idx = Number(cardMatch[1]);
            return {
              ...section,
              content: {
                ...content,
                cards: content.cards.map((c, i) =>
                  i === idx ? { ...c, imageUrl: url, imageWeek: null } : c,
                ),
              },
            };
          }
          return section;
        }
        if (section.type === "carousel") {
          const content = section.content as CarouselContent;
          const slideMatch = /^slide-(\d+)$/.exec(target.itemId);
          if (slideMatch) {
            const idx = Number(slideMatch[1]);
            return {
              ...section,
              content: {
                ...content,
                slides: content.slides.map((s, i) =>
                  i === idx ? { ...s, imageUrl: url, imageWeek: null } : s,
                ),
              },
            };
          }
          const titleMatch = /^title-(\d+)$/.exec(target.itemId);
          if (titleMatch) {
            const idx = Number(titleMatch[1]);
            return {
              ...section,
              content: {
                ...content,
                slides: content.slides.map((s, i) =>
                  i === idx ? { ...s, titleImageUrl: url, titleImageWeek: null } : s,
                ),
              },
            };
          }
          return section;
        }
        const content = section.content as { items?: (MacaronItem | MeaItem | EditoCard)[] };
        // Nouvelle image sélectionnée/uploadée : redevient native de la
        // semaine courante (semaine + position figées repassent dynamiques).
        const items = (content.items ?? []).map((item) =>
          item.id === target.itemId
            ? { ...item, imageUrl: url, imageWeek: null, exportPosition: null }
            : item,
        );
        return { ...section, content: { items } };
      });
      setDirty(serializeSections(next) !== savedSectionsRef.current);
      return next;
    });

    setMediaTarget(null);
  }, [mediaTarget, serializeSections]);

  // Templates publiés proposés dans le dialogue de création de section
  useEffect(() => {
    if (!createOpen) return;
    (async () => {
      const res = await fetch("/api/templates?status=published");
      if (res.ok) {
        const templates: CustomTemplate[] = await res.json();
        setPublishedTemplates(templates.sort((a, b) => a.name.localeCompare(b.name)));
      }
    })();
  }, [createOpen]);

  const createSection = async () => {
    if (!brief) return;
    if (dirty) {
      toast.error("Sauvegardez d'abord vos modifications avant de créer une section");
      return;
    }
    const payload: Record<string, unknown> = { briefId: brief.id };
    if (newSectionType.startsWith("tpl:")) {
      payload.type = "custom";
      payload.templateId = newSectionType.slice(4);
    } else {
      payload.type = newSectionType;
    }
    const res = await fetch("/api/sections", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      toast.error("Impossible de créer la section");
      return;
    }
    setCreateOpen(false);
    await fetchBrief();
    toast.success("Section créée");
  };

  const convertToTemplate = async (sectionId: string) => {
    if (dirty) {
      toast.error("Sauvegardez d'abord vos modifications avant de convertir en template");
      return;
    }
    const res = await fetch("/api/templates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fromSectionId: sectionId }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      toast.error(data?.error ?? "Impossible de convertir en template");
      return;
    }
    const template = await res.json();
    toast.success(
      `Template « ${template.name} » créé en brouillon — publiez-le depuis l'onglet Templates`,
      { duration: 6000 },
    );
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
            items={[
              { value: "edito", label: "Edito" },
              { value: "ariane", label: "Fil d'ariane" },
              { value: "global_header", label: "Global header" },
              { value: "macarons", label: "Macaron" },
              { value: "macarons_v2", label: "Macaron v2" },
              { value: "mea", label: "MEA" },
              { value: "mea_v2", label: "MEA v2" },
              { value: "custom", label: "Section personnalisée (vierge)" },
              { value: "carousel", label: "Slider" },
              ...publishedTemplates.map((template) => ({
                value: `tpl:${template.id}`,
                label: `Template : ${template.name}`,
              })),
            ]}
            onValueChange={(v) => v && setNewSectionType(v)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="w-fit min-w-(--anchor-width)">
              <SelectItem value="edito">Edito</SelectItem>
              <SelectItem value="ariane">Fil d&apos;ariane</SelectItem>
              <SelectItem value="global_header">Global header</SelectItem>
              <SelectItem value="macarons">Macaron</SelectItem>
              <SelectItem value="macarons_v2">Macaron v2</SelectItem>
              <SelectItem value="mea">MEA</SelectItem>
              <SelectItem value="mea_v2">MEA v2</SelectItem>
              <SelectItem value="custom">Section personnalisée (vierge)</SelectItem>
              <SelectItem value="carousel">Slider</SelectItem>
              {publishedTemplates.map((template) => (
                <SelectItem key={template.id} value={`tpl:${template.id}`}>
                  Template : {template.name}
                </SelectItem>
              ))}
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
            {editingName ? (
              <div className="flex items-center gap-1">
                <Input
                  autoFocus
                  value={nameValue}
                  placeholder={brief.slug}
                  onChange={(e) => setNameValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleRenameSubmit();
                    if (e.key === "Escape") setEditingName(false);
                  }}
                  onBlur={handleRenameSubmit}
                  className="h-7 w-56 text-[15px] font-semibold"
                />
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={handleRenameSubmit}
                  className="text-emerald-600 hover:text-emerald-500"
                >
                  <Check className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => setEditingName(false)}
                  className="text-muted-foreground/60 hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                className="group flex items-center gap-1.5"
                title={brief.name ? brief.slug : undefined}
                onClick={() => {
                  setNameValue(brief.name);
                  setEditingName(true);
                }}
              >
                <h1 className="text-[15px] font-semibold">{brief.name || brief.slug}</h1>
                <Pencil className="h-3 w-3 text-muted-foreground/0 transition-colors group-hover:text-muted-foreground/60" />
              </button>
            )}
            <span className="rounded-md bg-muted px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground">
              {brief.year} · S{String(brief.week).padStart(2, "0")} · {brief.locale.toUpperCase()}
            </span>
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
              {sections.length === 0 && (
                <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                  Aucune section. Cliquez sur « Créer une section » pour commencer.
                </div>
              )}
              {sections.map((section) => (
                <div
                  key={section.id}
                  className={`rounded-lg border border-border/60 bg-card shadow-sm ${section.visible ? "" : "opacity-70"}`}
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
                        onClick={(e) => e.stopPropagation()}
                        className="mr-1 flex items-center gap-1"
                        title={
                          section.visible
                            ? "Section incluse dans l'export"
                            : "Section informative — exclue de l'export"
                        }
                      >
                        <span className="text-[9px] font-medium uppercase tracking-wider text-muted-foreground/60">
                          Export
                        </span>
                        <Switch
                          checked={section.visible}
                          onCheckedChange={(checked) =>
                            updateSection(section.id, { visible: checked })
                          }
                          className="scale-75"
                        />
                      </span>
                      {section.type === "custom" && (
                        <span
                          onClick={(e) => {
                            e.stopPropagation();
                            convertToTemplate(section.id);
                          }}
                          className="inline-flex rounded p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                          title="Convertir en template (snapshot indépendant)"
                        >
                          <LayoutTemplate className="h-3.5 w-3.5" />
                        </span>
                      )}
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
                          onDropFile={(itemId, file) =>
                            handleDirectDrop({ sectionId: section.id, itemId, type: "macaron" }, file)
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
                          onDropFile={(itemId, file) =>
                            handleDirectDrop({ sectionId: section.id, itemId, type: "mea" }, file)
                          }
                        />
                      ) : section.type === "custom" ? (
                        <CustomEditor
                          content={normalizeCustomContent(section.content)}
                          briefWeek={brief.week}
                          onChange={(content) => updateSection(section.id, { content })}
                          onOpenMediaLibrary={(blockId) =>
                            setMediaTarget({
                              sectionId: section.id,
                              itemId: blockId,
                              type: "other",
                            })
                          }
                          onDropFile={(blockId, file) =>
                            handleDirectDrop({ sectionId: section.id, itemId: blockId, type: "other" }, file)
                          }
                        />
                      ) : section.type === "macarons_v2" ? (
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
                              type: "macaron_v2",
                            })
                          }
                          onDropFile={(itemId, file) =>
                            handleDirectDrop({ sectionId: section.id, itemId, type: "macaron_v2" }, file)
                          }
                        />
                      ) : section.type === "mea_v2" ? (
                        <MeaV2Editor
                          content={section.content as MeaV2Content}
                          briefWeek={brief.week}
                          briefYear={brief.year}
                          briefLocale={brief.locale}
                          onChange={(content) => updateSection(section.id, { content })}
                          onOpenMediaLibrary={(target) =>
                            setMediaTarget({
                              sectionId: section.id,
                              itemId: target,
                              type: target === "focus" ? "mea_v2_focus" : "mea_v2",
                            })
                          }
                          onDropFile={(target, file) =>
                            handleDirectDrop(
                              { sectionId: section.id, itemId: target, type: target === "focus" ? "mea_v2_focus" : "mea_v2" },
                              file,
                            )
                          }
                          onOpenVideoUpload={() => setVideoUploadSectionId(section.id)}
                        />
                      ) : section.type === "ariane" ? (
                        <ArianeEditor
                          content={section.content as ArianeContent}
                          onChange={(content) => updateSection(section.id, { content })}
                        />
                      ) : section.type === "edito" ? (
                        <EditoEditor
                          items={((section.content as EditoContent)?.items ?? [])}
                          briefWeek={brief.week}
                          onChange={(items) => updateSectionItems(section.id, items)}
                          onOpenMediaLibrary={(itemId) =>
                            setMediaTarget({
                              sectionId: section.id,
                              itemId,
                              type: "edito",
                            })
                          }
                          onDropFile={(itemId, file) =>
                            handleDirectDrop({ sectionId: section.id, itemId, type: "edito" }, file)
                          }
                        />
                      ) : section.type === "carousel" ? (
                        <CarouselEditor
                          content={section.content as CarouselContent}
                          briefWeek={brief.week}
                          onChange={(content) => updateSection(section.id, { content })}
                          onOpenMediaLibrary={(target) =>
                            setMediaTarget({
                              sectionId: section.id,
                              itemId: target,
                              type: target.startsWith("title-") ? "carousel_title" : "carousel",
                            })
                          }
                          onDropFile={(target, file) =>
                            handleDirectDrop(
                              {
                                sectionId: section.id,
                                itemId: target,
                                type: target.startsWith("title-") ? "carousel_title" : "carousel",
                              },
                              file,
                            )
                          }
                          onOpenVideoUpload={(slideIndex) =>
                            setCarouselVideoTarget({ sectionId: section.id, slideIndex })
                          }
                        />
                      ) : section.type === "global_header" ? (
                        <GlobalHeaderEditor
                          content={section.content as GlobalHeaderContent}
                          locale={brief.locale}
                          onChange={(content) => updateSection(section.id, { content })}
                        />
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          Template « {section.type} » non pris en charge dans l&apos;éditeur pour le moment.
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
                if (section.type === "custom") {
                  return (
                    <div key={section.id} className="space-y-1.5">
                      <p className="text-[11px] font-medium text-muted-foreground/80">
                        {section.title || "Section"}
                      </p>
                      <CustomPreview
                        content={normalizeCustomContent(section.content)}
                      />
                    </div>
                  );
                }
                if (section.type === "macarons_v2") {
                  return (
                    <div key={section.id} className="space-y-1.5">
                      <p className="text-[11px] font-medium text-muted-foreground/80">
                        {section.title || "Section"}
                      </p>
                      <MacaronsV2Preview
                        items={((section.content as MacaronsContent)?.items ?? [])}
                      />
                    </div>
                  );
                }
                if (section.type === "mea_v2") {
                  return (
                    <div key={section.id} className="space-y-1.5">
                      <p className="text-[11px] font-medium text-muted-foreground/80">
                        {section.title || "Section"}
                      </p>
                      <MeaV2Preview content={section.content as MeaV2Content} />
                    </div>
                  );
                }
                if (section.type === "ariane") {
                  return (
                    <div key={section.id} className="space-y-1.5">
                      <p className="text-[11px] font-medium text-muted-foreground/80">
                        {section.title || "Section"}
                      </p>
                      <ArianePreview content={section.content as ArianeContent} />
                    </div>
                  );
                }
                if (section.type === "edito") {
                  return (
                    <div key={section.id} className="space-y-1.5">
                      <p className="text-[11px] font-medium text-muted-foreground/80">
                        {section.title || "Section"}
                      </p>
                      <EditoPreview items={((section.content as EditoContent)?.items ?? [])} />
                    </div>
                  );
                }
                if (section.type === "carousel") {
                  return (
                    <div key={section.id} className="space-y-1.5">
                      <p className="text-[11px] font-medium text-muted-foreground/80">
                        {section.title || "Section"}
                      </p>
                      <CarouselPreview content={section.content as CarouselContent} />
                    </div>
                  );
                }
                if (section.type === "global_header") {
                  return (
                    <div key={section.id} className="space-y-1.5">
                      <p className="text-[11px] font-medium text-muted-foreground/80">
                        {section.title || "Section"}
                      </p>
                      <GlobalHeaderPreview content={section.content as GlobalHeaderContent} />
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
        // Recadrage/dimensions : délégués aux ASSET_SPECS via assetType (pas de
        // surcharge en dur ici — évite de devoir dupliquer la config à chaque
        // nouveau type d'asset ajouté).
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
            assetType={uploadAssetType}
            onUploaded={(url) => {
              handleImageSelected(url);
              setShowUpload(false);
              setDroppedFile(undefined);
              setDirectDropUpload(false);
            }}
            onClose={() => {
              setShowUpload(false);
              setDroppedFile(undefined);
              // Drop direct annulé : ne pas laisser apparaître une
              // médiathèque jamais ouverte par l'utilisateur.
              if (directDropUpload) setMediaTarget(null);
              setDirectDropUpload(false);
            }}
          />
        );
      })()}

      {videoUploadSectionId && (
        <ImageUploadDialog
          assetType="mea_v2_video"
          defaultWeek={brief.week}
          defaultYear={brief.year}
          onFileSelected={(file) => {
            captureVideoFirstFrame(file)
              .then((dataUrl) => dataUrlToFile(dataUrl, "vignette.jpg"))
              .then(setCapturedPosterFile)
              .catch(() => setCapturedPosterFile(null));
          }}
          onUploaded={(url) => {
            const sectionId = videoUploadSectionId;
            setSections((prev) => {
              const next = prev.map((s) => {
                if (s.id !== sectionId || s.type !== "mea_v2") return s;
                const content = s.content as MeaV2Content;
                return {
                  ...s,
                  content: {
                    ...content,
                    focus: { ...content.focus, mediaType: "video" as const, videoUrl: url },
                  },
                };
              });
              setDirty(serializeSections(next) !== savedSectionsRef.current);
              return next;
            });
            // Enchaîne sur l'upload de la vignette, pré-remplie par la 1ère
            // frame capturée côté navigateur (l'utilisateur ajuste le cadrage).
            // Toast explicite pour que ce 2e popin ne soit pas pris pour le
            // premier resté ouvert.
            if (sectionId && capturedPosterFile) {
              toast.success("Vidéo uploadée — ajustez le cadrage de la vignette suggérée", {
                duration: 5000,
              });
              setMediaTarget({ sectionId, itemId: "focus", type: "mea_v2_focus" });
              setDroppedFile(capturedPosterFile);
              setUploadAssetType("mea_v2_focus");
              setShowUpload(true);
            }
            setVideoUploadSectionId(null);
            setCapturedPosterFile(null);
          }}
          onClose={() => {
            setVideoUploadSectionId(null);
            setCapturedPosterFile(null);
          }}
        />
      )}
      {carouselVideoTarget && (
        <ImageUploadDialog
          assetType="carousel_video"
          defaultWeek={brief.week}
          defaultYear={brief.year}
          onFileSelected={(file) => {
            captureVideoFirstFrame(file)
              .then((dataUrl) => dataUrlToFile(dataUrl, "vignette.jpg"))
              .then(setCarouselCapturedPosterFile)
              .catch(() => setCarouselCapturedPosterFile(null));
          }}
          onUploaded={(url) => {
            const { sectionId, slideIndex } = carouselVideoTarget;
            setSections((prev) => {
              const next = prev.map((s) => {
                if (s.id !== sectionId || s.type !== "carousel") return s;
                const content = s.content as CarouselContent;
                return {
                  ...s,
                  content: {
                    ...content,
                    slides: content.slides.map((slide, i) =>
                      i === slideIndex
                        ? { ...slide, mediaType: "video" as const, videoUrl: url }
                        : slide,
                    ),
                  },
                };
              });
              setDirty(serializeSections(next) !== savedSectionsRef.current);
              return next;
            });
            // Enchaîne sur l'upload de la vignette, pré-remplie par la 1ère
            // frame capturée côté navigateur (l'utilisateur ajuste le cadrage).
            if (carouselCapturedPosterFile) {
              toast.success("Vidéo uploadée — ajustez le cadrage de la vignette suggérée", {
                duration: 5000,
              });
              setMediaTarget({ sectionId, itemId: `slide-${slideIndex}`, type: "carousel" });
              setDroppedFile(carouselCapturedPosterFile);
              setUploadAssetType("carousel");
              setShowUpload(true);
            }
            setCarouselVideoTarget(null);
            setCarouselCapturedPosterFile(null);
          }}
          onClose={() => {
            setCarouselVideoTarget(null);
            setCarouselCapturedPosterFile(null);
          }}
        />
      )}
    </div>
  );
}
