"use client";

import { useEffect, useState, useCallback, useRef, use, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ArrowLeft, Save, FileCode, Loader2, ChevronDown, ChevronsDownUp, ChevronsUpDown, Eye, EyeOff, Plus, Copy, ClipboardCopy, ClipboardPaste, LayoutTemplate, Trash2, Monitor, Smartphone, Pencil, Check, X, GripVertical, Lock } from "lucide-react";
import { clearCopiedSection, useCopiedSection, writeCopiedSection } from "@/lib/section-clipboard";
import { ClipboardChip } from "@/components/editor/clipboard-chip";
import { PasteProvider, useTranslateConfirm } from "@/components/editor/paste-context";
import { pasteSuccessMessage } from "@/components/editor/item-clipboard";
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
import type { BriefSection, BriefStatus, CmsPage, CustomTemplate, SectionType } from "@/types";
import { DEFAULT_HIDDEN_SECTION_TYPES, SECTION_TYPE_OPTIONS } from "@/lib/section-types";
import { SectionCmsAssetRow } from "@/components/briefs/section-cms-asset-row";
import { BriefLockButton } from "@/components/briefs/brief-lock-button";
import { useBriefLockContext } from "./brief-lock-context";
import { hasCmsAsset } from "@/lib/cms-asset";
import { TEMPLATE_UI, currentImageUrl } from "@/templates/registry-ui";
import { SectionErrorBoundary } from "@/components/editor/section-error-boundary";
import { useBriefSections } from "./use-brief-sections";
import { StatusActions } from "@/components/editor/status-actions";
import { StatusBadge } from "@/components/briefs/status-badge";
import { MediaLibraryDialog } from "@/components/media/media-library-dialog";
import { ImageUploadDialog } from "@/components/media/image-upload-dialog";
import { captureVideoFirstFrame, dataUrlToFile } from "@/lib/capture-video-frame";
import { cn } from "@/lib/utils";
import type { AssetType } from "@/types";

interface SortableSectionCardProps {
  section: BriefSection;
  isOpen: boolean;
  isPreviewVisible: boolean;
  onToggleOpen: () => void;
  onTogglePreview: () => void;
  onTitleChange: (title: string) => void;
  onVisibleChange: (visible: boolean) => void;
  onConvertToTemplate?: () => void;
  onDuplicate: () => void;
  onCopy: () => void;
  onDelete: () => void;
  /** Sans le verrou : tout est bloqué sauf copier, l'aperçu et le repli. */
  readOnly: boolean;
  onBlocked: () => void;
  children: ReactNode;
}

// En lecture seule, rend sa zone inerte (ni clic, ni saisie, ni glisser) et
// explique pourquoi au clic : un clic sur un élément inerte retombe sur cette
// enveloppe — qui l'arrête — au lieu de replier la section en dessous.
function ReadOnlyZone({
  readOnly,
  onBlocked,
  className,
  as: Tag = "span",
  children,
}: {
  readOnly: boolean;
  onBlocked: () => void;
  className?: string;
  /** "div" pour envelopper du contenu en bloc (span dans l'en-tête, qui est un bouton). */
  as?: "span" | "div";
  children: ReactNode;
}) {
  return (
    <Tag
      className={cn(className, readOnly && "cursor-not-allowed opacity-60")}
      onClick={
        readOnly
          ? (e: React.MouseEvent) => {
              e.stopPropagation();
              onBlocked();
            }
          : undefined
      }
    >
      <Tag inert={readOnly} className="contents">
        {children}
      </Tag>
    </Tag>
  );
}

// Composant à part (plutôt qu'inline dans le .map() de la page) : useSortable
// est un Hook, qui ne peut pas être appelé depuis un callback de map().
function SortableSectionCard({
  section,
  isOpen,
  isPreviewVisible,
  onToggleOpen,
  onTogglePreview,
  onTitleChange,
  onVisibleChange,
  onConvertToTemplate,
  onDuplicate,
  onCopy,
  onDelete,
  readOnly,
  onBlocked,
  children,
}: SortableSectionCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: section.id,
  });
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "rounded-lg border border-border/60 bg-card shadow-sm transition-all",
        !section.visible && "opacity-70",
        isDragging && "relative z-10 opacity-50 shadow-lg scale-[1.01]",
      )}
    >
      <div className="flex items-center gap-1 pl-1.5">
        <ReadOnlyZone readOnly={readOnly} onBlocked={onBlocked} className="flex shrink-0">
          <button
            type="button"
            className="shrink-0 cursor-grab touch-none rounded p-1.5 text-muted-foreground/40 transition-colors hover:text-muted-foreground"
            title="Déplacer la section"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-4 w-4" />
          </button>
        </ReadOnlyZone>
        <button
          type="button"
          onClick={onToggleOpen}
          className="flex flex-1 items-center justify-between gap-3 py-3 pr-4 text-sm font-semibold transition-colors hover:bg-muted/50"
        >
          <ReadOnlyZone readOnly={readOnly} onBlocked={onBlocked} className="flex w-full max-w-80">
            <Input
              value={section.title || section.type}
              onClick={(e) => e.stopPropagation()}
              onChange={(e) => onTitleChange(e.target.value)}
              className="h-8 w-full"
            />
          </ReadOnlyZone>
          <div className="flex items-center gap-1">
            <ReadOnlyZone readOnly={readOnly} onBlocked={onBlocked} className="flex items-center gap-1">
            {section.type !== "moodboard" && (
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
                <Switch checked={section.visible} onCheckedChange={onVisibleChange} className="scale-75" />
              </span>
            )}
            {onConvertToTemplate && (
              <span
                onClick={(e) => {
                  e.stopPropagation();
                  onConvertToTemplate();
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
                onDuplicate();
              }}
              className="inline-flex rounded p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              title="Dupliquer la section"
            >
              <Copy className="h-3.5 w-3.5" />
            </span>
            </ReadOnlyZone>
            <span
              onClick={(e) => {
                e.stopPropagation();
                onCopy();
              }}
              className="inline-flex rounded p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              title="Copier la section (pour la coller dans ce brief ou un autre)"
            >
              <ClipboardCopy className="h-3.5 w-3.5" />
            </span>
            <ReadOnlyZone readOnly={readOnly} onBlocked={onBlocked} className="flex">
              <span
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                }}
                className="inline-flex rounded p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-destructive"
                title="Supprimer la section"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </span>
            </ReadOnlyZone>
            <span
              onClick={(e) => {
                e.stopPropagation();
                onTogglePreview();
              }}
              className="inline-flex rounded p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              title={isPreviewVisible ? "Masquer l'aperçu" : "Afficher l'aperçu"}
            >
              {isPreviewVisible ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
            </span>
            <ChevronDown
              className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${isOpen ? "rotate-0" : "-rotate-90"}`}
            />
          </div>
        </button>
      </div>
      {isOpen && (
        <ReadOnlyZone as="div" readOnly={readOnly} onBlocked={onBlocked} className="block border-t border-border/60 px-4 py-4">
          {children}
        </ReadOnlyZone>
      )}
    </div>
  );
}

export default function BriefEditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  // Chargement, édition, drapeau "non sauvegardé" et enregistrement des
  // sections vivent dans ce hook — cf. use-brief-sections.ts.
  const {
    brief,
    sections,
    loading,
    saving,
    dirty,
    setDirty,
    applySections,
    updateSection,
    handleSave,
    refetch: fetchBrief,
  } = useBriefSections(id);

  // Verrou d'édition : sans lui, le brief est en lecture seule. Porté par la
  // mise en page du brief pour survivre au passage par l'export.
  const briefLock = useBriefLockContext();
  const canEdit = briefLock.mine;

  // Clic dans l'éditeur sans le verrou : on explique, et on fait clignoter le
  // bouton Verrouiller pour montrer où agir. Compteur plutôt que booléen :
  // chaque nouveau clic relance la mise en évidence au lieu d'être ignoré.
  const [lockHint, setLockHint] = useState(0);
  useEffect(() => {
    if (!lockHint) return;
    const timer = setTimeout(() => setLockHint(0), 1600);
    return () => clearTimeout(timer);
  }, [lockHint]);
  const signalReadOnly = () => {
    toast.info(
      briefLock.status?.state === "other"
        ? "Ce brief est verrouillé par quelqu'un d'autre : lecture seule."
        : "Brief en lecture seule — cliquez sur « Verrouiller » pour le modifier.",
      // Même id : des clics répétés remplacent le message au lieu de l'empiler.
      { id: "brief-read-only" },
    );
    setLockHint((n) => n + 1);
  };

  const sectionDragSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleSectionDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;
      applySections((prev) => {
        const oldIndex = prev.findIndex((s) => s.id === active.id);
        const newIndex = prev.findIndex((s) => s.id === over.id);
        // order réindexé sur la position réelle : c'est lui qui est persisté
        // à la sauvegarde (handleSave envoie order pour chaque section).
        return arrayMove(prev, oldIndex, newIndex).map((s, index) => ({ ...s, order: index }));
      });
    },
    [applySections],
  );

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
  // Upload vidéo (carte focus MEA v2, diapositive de carousel) : direct, sans
  // médiathèque, puis enchaîné sur l'upload de la vignette pré-remplie par la
  // 1ère frame capturée. Le détail par template vit dans TEMPLATE_UI[type].video.
  const [videoTarget, setVideoTarget] = useState<{ sectionId: string; target: string } | null>(null);
  const [capturedPosterFile, setCapturedPosterFile] = useState<File | null>(null);
  const [pendingNav, setPendingNav] = useState<string | null>(null);
  // Action bloquée par des modifications non sauvegardées (supprimer/dupliquer
  // une section, changer le statut...) : on la met de côté plutôt que de
  // juste avertir par toast, pour pouvoir l'enchaîner après sauvegarde.
  const [pendingGuardedAction, setPendingGuardedAction] = useState<{
    label: string;
    run: () => void | Promise<void>;
  } | null>(null);
  // Sections repliées par défaut, aperçus visibles par défaut : ces maps ne
  // retiennent que les choix explicites de l'utilisateur (d'où `?? false` /
  // `?? true` à la lecture).
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});
  const allSectionsOpen = sections.length > 0 && sections.every((s) => openSections[s.id] ?? false);
  const [previewSections, setPreviewSections] = useState<Record<string, boolean>>({});
  const [createOpen, setCreateOpen] = useState(false);
  // Un type de section, ou "tpl:<id>" (depuis un template publié)
  const [newSectionType, setNewSectionType] = useState<string>("macarons_v2");
  const [publishedTemplates, setPublishedTemplates] = useState<CustomTemplate[]>([]);
  // Types masqués dans Paramétrage : retirés du menu de création.
  const [hiddenSectionTypes, setHiddenSectionTypes] = useState<SectionType[]>(DEFAULT_HIDDEN_SECTION_TYPES);
  const sectionTypeOptions = [
    ...SECTION_TYPE_OPTIONS.filter((o) => !hiddenSectionTypes.includes(o.value)),
    ...publishedTemplates.map((template) => ({ value: `tpl:${template.id}`, label: `Template : ${template.name}` })),
  ];
  // Type retenu devenu masqué : on retombe sur le premier proposé.
  const selectedSectionType = sectionTypeOptions.some((o) => o.value === newSectionType)
    ? newSectionType
    : (sectionTypeOptions[0]?.value ?? "");
  const [pendingDeleteSectionId, setPendingDeleteSectionId] = useState<string | null>(null);
  const panelGroupContainerRef = useRef<HTMLDivElement | null>(null);
  const previewGroupRef = useGroupRef();

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

  // Exécute `run` directement si rien n'est en attente de sauvegarde, sinon
  // ouvre le dialogue "sauvegarder d'abord" et met `run` de côté pour
  // l'enchaîner juste après la sauvegarde.
  const runGuarded = (label: string, run: () => void | Promise<void>) => {
    if (dirty) {
      setPendingGuardedAction({ label, run });
    } else {
      run();
    }
  };

  const saveAndRunGuarded = async () => {
    if (!pendingGuardedAction) return;
    await handleSave();
    const { run } = pendingGuardedAction;
    setPendingGuardedAction(null);
    await run();
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

  const handleStatusChange = (newStatus: string) => {
    runGuarded("changer le statut", async () => {
      await fetch(`/api/briefs/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      fetchBrief();
      toast.success("Statut mis à jour");
    });
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
    const { sectionId, itemId } = mediaTarget;
    updateSection(sectionId, (section) => {
      const setImage = TEMPLATE_UI[section.type]?.setImage;
      return setImage ? { content: setImage(section.content, itemId, url) } : {};
    });
    setMediaTarget(null);
  }, [mediaTarget, updateSection]);

  // Pages de l'onglet Assets CMS, pour le choix de page de chaque section.
  const [cmsPages, setCmsPages] = useState<CmsPage[]>([]);
  useEffect(() => {
    (async () => {
      const res = await fetch("/api/cms-pages");
      if (res.ok) setCmsPages(await res.json());
    })();
  }, []);

  // Templates publiés et types masqués, relus à chaque ouverture du dialogue
  // de création de section.
  useEffect(() => {
    if (!createOpen) return;
    (async () => {
      const [templatesRes, settingsRes] = await Promise.all([
        fetch("/api/templates?status=published"),
        fetch("/api/settings"),
      ]);
      if (templatesRes.ok) {
        const templates: CustomTemplate[] = await templatesRes.json();
        setPublishedTemplates(templates.sort((a, b) => a.name.localeCompare(b.name)));
      }
      if (settingsRes.ok) {
        const data = await settingsRes.json();
        if (Array.isArray(data.hiddenSectionTypes)) setHiddenSectionTypes(data.hiddenSectionTypes);
      }
    })();
  }, [createOpen]);

  const createSection = () => {
    if (!brief || !selectedSectionType) return;
    setCreateOpen(false);
    runGuarded("créer une section", async () => {
      const payload: Record<string, unknown> = { briefId: brief.id };
      if (selectedSectionType.startsWith("tpl:")) {
        payload.type = "custom";
        payload.templateId = selectedSectionType.slice(4);
      } else {
        payload.type = selectedSectionType;
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
      await fetchBrief();
      toast.success("Section créée");
    });
  };

  const convertToTemplate = (sectionId: string) => {
    runGuarded("convertir en template", async () => {
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
    });
  };

  const duplicateSection = (sectionId: string) => {
    runGuarded("dupliquer cette section", async () => {
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
    });
  };

  const copiedSection = useCopiedSection();

  // Instantané de la section telle qu'affichée (modifications non enregistrées
  // comprises) ; remplace toute copie précédente.
  const copySection = (section: BriefSection) => {
    if (!brief) return;
    const ok = writeCopiedSection({
      type: section.type,
      title: section.title,
      content: section.content,
      visible: section.visible,
      cmsPageId: section.cmsPageId ?? null,
      cmsAssetId: section.cmsAssetId ?? "",
      sourceWeek: brief.week,
      sourceLocale: brief.locale,
      copiedAt: new Date().toISOString(),
    });
    if (ok) toast.success(`« ${section.title || section.type} » copiée — « Coller » l'ajoute à n'importe quel brief`);
    else toast.error("Copie impossible : le navigateur refuse le stockage local");
  };

  // Fenêtre « traduire ou non » des collages d'une langue à l'autre (sections et items).
  const translateConfirm = useTranslateConfirm();

  const pasteSection = async () => {
    if (!brief || !copiedSection) return;
    let translate = false;
    if (copiedSection.sourceLocale.toUpperCase() !== brief.locale.toUpperCase()) {
      const choice = await translateConfirm.ask(copiedSection.sourceLocale, brief.locale);
      if (choice === null) return;
      translate = choice;
    }
    runGuarded("coller la section", async () => {
      const res = await fetch("/api/sections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ briefId: brief.id, pasted: copiedSection, translate }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        toast.error(data?.error ?? "Impossible de coller la section");
        return;
      }
      await fetchBrief();
      toast.success(pasteSuccessMessage("Section collée", data?.translation));
    });
  };

  const deleteSection = () => {
    if (!pendingDeleteSectionId) return;
    const sectionId = pendingDeleteSectionId;
    setPendingDeleteSectionId(null);
    runGuarded("supprimer cette section", async () => {
      const res = await fetch("/api/sections", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: sectionId }),
      });
      if (!res.ok) {
        toast.error("Impossible de supprimer la section");
        return;
      }
      await fetchBrief();
      toast.success("Section supprimée");
    });
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
  }, [previewGroupRef]);

  if (loading || !brief) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Éditeur et aperçu viennent du registre UI : chaque template y déclare ses
  // composants et la correspondance "emplacement visé -> type d'asset".
  const briefCtx = { year: brief.year, week: brief.week, locale: brief.locale };

  const renderSectionEditor = (section: BriefSection) => {
    const Editor = TEMPLATE_UI[section.type]?.Editor;
    if (!Editor) {
      return (
        <p className="text-sm text-muted-foreground">
          Template « {section.type} » non pris en charge dans l&apos;éditeur pour le moment.
        </p>
      );
    }
    return (
      <SectionErrorBoundary label={section.title || "Section"}>
        <Editor
          content={section.content}
          brief={briefCtx}
          onChange={(content) => updateSection(section.id, { content })}
          onOpenMedia={(target, type) =>
            setMediaTarget({ sectionId: section.id, itemId: target, type })
          }
          onDropFile={(target, type, file) =>
            handleDirectDrop({ sectionId: section.id, itemId: target, type }, file)
          }
          onOpenVideoUpload={(target) => setVideoTarget({ sectionId: section.id, target })}
        />
      </SectionErrorBoundary>
    );
  };

  const renderSectionPreview = (section: BriefSection) => {
    const Preview = TEMPLATE_UI[section.type]?.Preview;
    if (!Preview) return null;
    return (
      <div key={section.id} className="space-y-1.5">
        <p className="text-[11px] font-medium text-muted-foreground/80">
          {section.title || "Section"}
        </p>
        <SectionErrorBoundary label={section.title || "Section"} resetKey={section.content}>
          <Preview content={section.content} />
        </SectionErrorBoundary>
      </div>
    );
  };

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
      {/* Action bloquée par des modifications non sauvegardées (supprimer,
          dupliquer, changer le statut...) */}
      <Dialog open={!!pendingGuardedAction} onOpenChange={() => setPendingGuardedAction(null)}>
        <DialogContent className="w-fit max-w-[calc(100%-2rem)] sm:max-w-fit">
          <DialogHeader>
            <DialogTitle>Modifications non sauvegardées</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Vous avez des modifications en cours. Sauvegardez-les avant de {pendingGuardedAction?.label}.
          </p>
          <DialogFooter className="sm:flex-wrap">
            <Button variant="outline" onClick={() => setPendingGuardedAction(null)}>
              Annuler
            </Button>
            <Button onClick={saveAndRunGuarded} disabled={saving}>
              {saving && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
              Sauvegarder et continuer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {translateConfirm.dialog}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Créer une section</DialogTitle>
            <DialogDescription>
              Choisissez le type de section à ajouter.
            </DialogDescription>
          </DialogHeader>
          <Select
            value={selectedSectionType}
            items={sectionTypeOptions}
            onValueChange={(v) => v && setNewSectionType(v)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="w-fit min-w-(--anchor-width)">
              {sectionTypeOptions.map(({ value, label }) => (
                <SelectItem key={value} value={value}>
                  {label}
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
              Cette action est irréversible.
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
                className="group flex items-center gap-1.5 disabled:cursor-default"
                title={brief.name ? brief.slug : undefined}
                disabled={!canEdit}
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
            <BriefLockButton
              status={briefLock.status}
              busy={briefLock.busy}
              highlight={lockHint > 0}
              onLock={briefLock.lock}
              onUnlock={() => {
                // Une fois déverrouillé, l'éditeur passe en lecture seule :
                // des modifications en attente ne pourraient plus être enregistrées.
                if (
                  dirty &&
                  !window.confirm(
                    "Des modifications ne sont pas sauvegardées. Déverrouiller quand même ? Elles ne pourront plus être enregistrées.",
                  )
                ) {
                  return;
                }
                briefLock.unlock();
              }}
            />
            {dirty && (
              <span className="rounded-md bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-medium text-amber-600">
                Non sauvegardé
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {canEdit && <StatusActions status={brief.status} onChange={handleStatusChange} />}
          <Button
            variant="outline"
            size="sm"
            className="rounded-lg"
            onClick={() => navigateWithGuard(`/briefs/${id}/export`)}
          >
            <FileCode className="mr-1.5 h-3.5 w-3.5" />
            Exporter
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={saving || !canEdit}
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

      <div ref={panelGroupContainerRef} className="flex-1">
      <PanelGroup groupRef={previewGroupRef} orientation="horizontal" className="h-[95svh!important]">
        <Panel id="editor" defaultSize={50} minSize={25}>
          <div className="h-full overflow-y-auto p-6">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-1.5">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-muted-foreground/70 hover:text-foreground"
                  onClick={() =>
                    setOpenSections(
                      Object.fromEntries(sections.map((s) => [s.id, !allSectionsOpen])),
                    )
                  }
                  disabled={sections.length === 0}
                  title={allSectionsOpen ? "Replier toutes les sections" : "Déplier toutes les sections"}
                >
                  {allSectionsOpen ? <ChevronsDownUp className="h-3.5 w-3.5" /> : <ChevronsUpDown className="h-3.5 w-3.5" />}
                </Button>
                <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
                  Éditeur
                </h2>
              </div>
              <div className="flex min-w-0 items-center gap-2">
                {copiedSection && (
                  <ClipboardChip
                    label={copiedSection.title || copiedSection.type}
                    locale={copiedSection.sourceLocale}
                    week={copiedSection.sourceWeek}
                    copiedAt={copiedSection.copiedAt}
                    onClear={clearCopiedSection}
                  />
                )}
                {copiedSection && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={pasteSection}
                    disabled={!canEdit}
                    title={`Coller « ${copiedSection.title || copiedSection.type} »`}
                  >
                    <ClipboardPaste className="mr-1.5 h-3.5 w-3.5" />
                    Coller
                  </Button>
                )}
                <Button
                  size="sm"
                  className="bg-primary text-primary-foreground hover:bg-primary/90"
                  onClick={() => setCreateOpen(true)}
                  disabled={!canEdit}
                >
                  <Plus className="mr-1.5 h-3.5 w-3.5" />
                  Créer une section
                </Button>
              </div>
            </div>
            {!canEdit && briefLock.status && (
              // Collé en haut du panneau : reste visible même après avoir
              // fait défiler loin dans le brief. Fond opaque pour que le
              // contenu ne transparaisse pas en passant dessous.
              <div
                className={cn(
                  "sticky top-0 z-20 mb-3 flex items-center gap-2 rounded-lg border px-3 py-2 text-xs shadow-sm",
                  briefLock.status.state === "other"
                    ? "border-amber-300 bg-amber-50 text-amber-800"
                    : "border-primary/30 bg-background text-foreground",
                )}
              >
                <Lock className="h-3.5 w-3.5 shrink-0" />
                <span className="flex-1">
                  {briefLock.status.state === "other"
                    ? "Ce brief est en cours de modification par quelqu'un d'autre : lecture seule. Il se libérera dès que cette personne le quittera."
                    : "Lecture seule — verrouillez le brief pour le modifier."}
                </span>
                {briefLock.status.state === "free" && (
                  <Button size="sm" className="h-6 px-2 text-xs" onClick={briefLock.lock} disabled={briefLock.busy}>
                    <Lock className="mr-1 h-3 w-3" />
                    Verrouiller
                  </Button>
                )}
              </div>
            )}
            {/* Sans le verrou, chaque section bloque elle-même ses zones
                modifiables (inert, cf. ReadOnlyZone) et explique pourquoi au
                clic ; copier la section, l'aperçu et le repli restent
                utilisables, pour pouvoir copier depuis un brief en lecture seule.
                L'aperçu, lui, reste consultable. */}
            <div className="space-y-3">
              {sections.length === 0 && (
                <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                  Aucune section. Cliquez sur « Créer une section » pour commencer.
                </div>
              )}
              <PasteProvider value={{ week: brief.week, locale: brief.locale, askTranslate: translateConfirm.ask }}>
              <DndContext
                sensors={sectionDragSensors}
                collisionDetection={closestCenter}
                onDragEnd={handleSectionDragEnd}
              >
                <SortableContext items={sections.map((s) => s.id)} strategy={verticalListSortingStrategy}>
                  {sections.map((section) => (
                    <SortableSectionCard
                      key={section.id}
                      section={section}
                      isOpen={openSections[section.id] ?? false}
                      isPreviewVisible={previewSections[section.id] ?? true}
                      onToggleOpen={() =>
                        setOpenSections((prev) => ({ ...prev, [section.id]: !(prev[section.id] ?? false) }))
                      }
                      onTogglePreview={() =>
                        setPreviewSections((prev) => ({ ...prev, [section.id]: !(prev[section.id] ?? true) }))
                      }
                      onTitleChange={(title) => updateSection(section.id, { title })}
                      onVisibleChange={(visible) => updateSection(section.id, { visible })}
                      onConvertToTemplate={
                        section.type === "custom" ? () => convertToTemplate(section.id) : undefined
                      }
                      onDuplicate={() => duplicateSection(section.id)}
                      onCopy={() => copySection(section)}
                      readOnly={!canEdit}
                      onBlocked={signalReadOnly}
                      onDelete={() => setPendingDeleteSectionId(section.id)}
                    >
                      {hasCmsAsset(section.type) && (
                        <SectionCmsAssetRow
                          section={section}
                          pages={cmsPages}
                          onChange={(patch) => updateSection(section.id, patch)}
                        />
                      )}
                      {renderSectionEditor(section)}
                    </SortableSectionCard>
                  ))}
                </SortableContext>
              </DndContext>
              </PasteProvider>
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
                if (!(previewSections[section.id] ?? true)) return null;
                return renderSectionPreview(section);
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
          currentUrl={(() => {
            const section = sections.find((s) => s.id === mediaTarget.sectionId);
            return section ? currentImageUrl(section.type, section.content, mediaTarget.itemId) : "";
          })()}
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
        // Nom déjà connu pour cet emplacement (label/titre de l'item ou de la
        // carte visée) — chaque template dit comment le retrouver dans son
        // propre contenu, cf. TEMPLATE_UI[type].labelFor.
        const defaultLabel = section
          ? TEMPLATE_UI[section.type]?.labelFor?.(section.content, mediaTarget.itemId)?.replace(/\n/g, " ")
          : undefined;
        // Recadrage/dimensions : délégués aux ASSET_SPECS via assetType (pas de
        // surcharge en dur ici — évite de devoir dupliquer la config à chaque
        // nouveau type d'asset ajouté).
        return (
          <ImageUploadDialog
            defaultLabel={defaultLabel}
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

      {videoTarget && (() => {
        const section = sections.find((s) => s.id === videoTarget.sectionId);
        const video = section ? TEMPLATE_UI[section.type]?.video : undefined;
        if (!video) return null;
        const closeVideoUpload = () => {
          setVideoTarget(null);
          setCapturedPosterFile(null);
        };
        return (
          <ImageUploadDialog
            assetType={video.assetType}
            defaultWeek={brief.week}
            defaultYear={brief.year}
            onFileSelected={(file) => {
              captureVideoFirstFrame(file)
                .then((dataUrl) => dataUrlToFile(dataUrl, "vignette.jpg"))
                .then(setCapturedPosterFile)
                .catch(() => setCapturedPosterFile(null));
            }}
            onUploaded={(url) => {
              const { sectionId, target } = videoTarget;
              updateSection(sectionId, (s) => ({ content: video.set(s.content, target, url) }));
              // Enchaîne sur l'upload de la vignette, pré-remplie par la 1ère
              // frame capturée côté navigateur (l'utilisateur ajuste le cadrage).
              // Toast explicite pour que ce 2e popin ne soit pas pris pour le
              // premier resté ouvert.
              if (capturedPosterFile) {
                const poster = video.poster(target);
                toast.success("Vidéo uploadée — ajustez le cadrage de la vignette suggérée", {
                  duration: 5000,
                });
                setMediaTarget({ sectionId, itemId: poster.target, type: poster.assetType });
                setDroppedFile(capturedPosterFile);
                setUploadAssetType(poster.assetType);
                setShowUpload(true);
              }
              closeVideoUpload();
            }}
            onClose={closeVideoUpload}
          />
        );
      })()}
    </div>
  );
}
