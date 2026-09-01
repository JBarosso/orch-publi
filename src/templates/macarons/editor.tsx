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
import { ImportCmsDialog } from "@/components/editor/import-cms-dialog";
import { v4 as uuidv4 } from "uuid";
import type { MacaronItem } from "@/types";
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
  // "v2" ajoute l'import depuis le code CMS (quickaccess v2 uniquement — le
  // parseur cible les classes .quickaccess-v2-item, absentes du HTML v1).
  variant?: "v1" | "v2";
}

export function MacaronsEditor({
  items,
  briefWeek,
  onChange,
  onOpenMediaLibrary,
  onDropFile,
  variant = "v1",
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
      const { items: imported, issueCount } = parseQuickaccessV2HTML(html, briefWeek);
      onChange(imported);
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
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-muted-foreground">
          Macarons ({items.length})
        </h3>
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
          description="Colle le code HTML d'une section quickaccess v2 déjà exportée vers le CMS : les tuiles sont reconstruites automatiquement, les champs non reconnus sont signalés dans leur commentaire."
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
