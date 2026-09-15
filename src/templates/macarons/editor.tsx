"use client";

import { useState, useCallback } from "react";
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
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { Plus, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ImportCmsDialog } from "@/components/editor/import-cms-dialog";
import { v4 as uuidv4 } from "uuid";
import type { MacaronItem, QuickaccessPlacement } from "@/types";
import { createEmptyMacaron } from "./schema";
import { MacaronItemEditor } from "./macaron-item-editor";
import { parseQuickaccessV2HTML } from "../macarons-v2/import";

interface MacaronsEditorProps {
  items: MacaronItem[];
  briefWeek: number;
  briefYear: number;
  briefLocale: string;
  onChange: (items: MacaronItem[]) => void;
  onOpenMediaLibrary: (itemId: string) => void;
  onDropFile?: (itemId: string, file: File) => void;
  // "v2" ajoute l'import depuis le code CMS et les réglages de chemin CMS
  // (quickaccess v2 uniquement — le parseur cible les classes
  // .quickaccess-v2-item, absentes du HTML v1).
  variant?: "v1" | "v2";
  /** Chemin CMS custom de la section, hérité par les items qui l'activent. */
  sectionCustomPath?: string;
  onSectionCustomPathChange?: (path: string) => void;
  /**
   * Import CMS uniquement : items et chemin de section doivent changer dans
   * le même geste. Appeler `onChange` puis `onSectionCustomPathChange` l'un
   * après l'autre perd le premier — les deux reconstruisent le contenu à
   * partir du même objet reçu par l'éditeur, capturé avant qu'aucun des deux
   * appels n'ait été pris en compte (aucun rendu entre les deux), donc le
   * second écrase le premier. Repli sur l'ancien enchaînement si absent.
   */
  onImport?: (items: MacaronItem[], customPath: string, placement: QuickaccessPlacement) => void;
  /** Emplacement CMS de la section (quickaccess v2) : décide des classes exportées. */
  placement?: QuickaccessPlacement;
  onPlacementChange?: (placement: QuickaccessPlacement) => void;
}

export function MacaronsEditor({
  items,
  briefWeek,
  briefYear,
  briefLocale,
  onChange,
  onOpenMediaLibrary,
  onDropFile,
  variant = "v1",
  sectionCustomPath = "",
  onSectionCustomPathChange,
  onImport,
  placement = "homepage",
  onPlacementChange,
}: MacaronsEditorProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [importOpen, setImportOpen] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveId(null);
      if (over && active.id !== over.id) {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        onChange(arrayMove(items, oldIndex, newIndex));
      }
    },
    [items, onChange],
  );

  const addItem = () => {
    onChange([...items, createEmptyMacaron(uuidv4())]);
  };

  const updateItem = (id: string, updates: Partial<MacaronItem>) => {
    onChange(
      items.map((item) => {
        if (item.id !== id) return item;
        const next = { ...item, ...updates };
        if ("imageWeek" in updates) {
          if (next.imageWeek != null && next.imageWeek !== briefWeek) {
            // Semaine différente de celle du brief saisie manuellement : fige
            // la position actuelle (parmi les items visibles) pour que
            // l'export ne se renumérote plus si l'item est déplacé.
            const visibleIndex = items.filter((i) => i.visible).findIndex((i) => i.id === id);
            next.exportPosition = visibleIndex >= 0 ? visibleIndex + 1 : null;
          } else {
            // Revenu natif (vide ou = semaine du brief) : défige
            next.exportPosition = null;
          }
        }
        return next;
      }),
    );
  };

  const removeItem = (id: string) => {
    onChange(items.filter((item) => item.id !== id));
  };

  const handleImport = (html: string) => {
    const hasContent = items.some((i) => i.label.trim() || i.imageUrl || i.link.trim() || i.cgid.trim() || i.cid.trim());
    if (hasContent && !window.confirm("Remplacer les macarons actuels par ceux importés du CMS ?")) {
      return;
    }
    try {
      const {
        items: imported,
        customPath,
        placement: importedPlacement,
        issueCount,
      } = parseQuickaccessV2HTML(html, briefWeek);
      if (onImport) {
        // customPath toujours réappliqué (même vide) : l'import remplace la
        // section entière, un chemin resté de l'import précédent serait trompeur.
        onImport(imported, customPath, importedPlacement);
      } else {
        onChange(imported);
        onSectionCustomPathChange?.(customPath);
      }
      setImportOpen(false);
      toast.success(
        issueCount > 0
          ? `${imported.length} macarons importés, ${issueCount} à vérifier (voir commentaires).`
          : `${imported.length} macarons importés.`,
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Échec de l'import");
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-6">
        <div className="flex flex-1 flex-wrap items-center gap-2">
          <h3 className="text-sm font-medium text-muted-foreground">
            Macarons ({items.length})
          </h3>
          {variant === "v2" && onPlacementChange && (
            <select
              value={placement}
              onChange={(e) => onPlacementChange(e.target.value as QuickaccessPlacement)}
              className="h-7 rounded-md border border-input bg-transparent px-2 text-xs outline-none"
              title="Décide des classes CSS écrites à l'export — elles diffèrent entre la page d'accueil et une page catégorie niveau 2"
            >
              <option value="homepage">Page d&apos;accueil</option>
              <option value="cat_lvl2">Catégorie niveau 2</option>
            </select>
          )}
          {variant === "v2" && onSectionCustomPathChange && (
            <Input
              placeholder="Chemin custom de la section (ex: landing-pages/fille/campagne)"
              value={sectionCustomPath}
              onChange={(e) => onSectionCustomPathChange(e.target.value)}
              className="h-7 flex-1 text-xs"
              title="Remplace homepage/{année}/wk{semaine} pour les items dont le toggle « Chemin custom » est actif"
            />
          )}
        </div>
        <div className="flex items-center gap-2">
          {variant === "v2" && (
            <Button variant="outline" size="sm" onClick={() => setImportOpen(true)}>
              <Upload className="mr-1 h-3 w-3" />
              Importer du CMS
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={addItem}>
            <Plus className="mr-1 h-3 w-3" />
            Ajouter
          </Button>
        </div>
      </div>

      {variant === "v2" && (
        <ImportCmsDialog
          open={importOpen}
          onOpenChange={setImportOpen}
          description="Colle le code HTML d'une section quickaccess déjà exportée vers le CMS — page d'accueil ou catégorie niveau 2 : les tuiles sont reconstruites automatiquement, les champs non reconnus sont signalés dans leur commentaire."
          onImport={handleImport}
        />
      )}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={(e) => setActiveId(String(e.active.id))}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={items.map((i) => i.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-2">
            {items.map((item) => (
              <MacaronItemEditor
                key={item.id}
                item={item}
                isActive={item.id === activeId}
                briefWeek={briefWeek}
                briefYear={briefYear}
                briefLocale={briefLocale}
                variant={variant}
                sectionCustomPath={sectionCustomPath}
                onUpdate={(updates) => updateItem(item.id, updates)}
                onRemove={() => removeItem(item.id)}
                onOpenMediaLibrary={() => onOpenMediaLibrary(item.id)}
                onDropFile={onDropFile ? (file) => onDropFile(item.id, file) : undefined}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {items.length === 0 && (
        <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
          Aucun macaron. Cliquez sur &quot;Ajouter&quot; pour commencer.
        </div>
      )}
    </div>
  );
}
