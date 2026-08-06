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
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { v4 as uuidv4 } from "uuid";
import type { CatBannerItem } from "@/types";
import { createEmptyCatBannerItem } from "./schema";
import { CatBannerItemEditor } from "./cat-banner-item-editor";

interface CatBannerEditorProps {
  items: CatBannerItem[];
  briefWeek: number;
  onChange: (items: CatBannerItem[]) => void;
  // "<itemId>:desktop" | "<itemId>:mobile" — même convention que
  // carousel/MEA v2 (une seule string cible, parsée côté page.tsx).
  onOpenMediaLibrary: (target: string) => void;
  onDropFile?: (target: string, file: File) => void;
}

export function CatBannerEditor({
  items,
  briefWeek,
  onChange,
  onOpenMediaLibrary,
  onDropFile,
}: CatBannerEditorProps) {
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
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
    onChange([...items, createEmptyCatBannerItem(uuidv4())]);
  };

  const updateItem = (id: string, updates: Partial<CatBannerItem>) => {
    onChange(
      items.map((item) => {
        if (item.id !== id) return item;
        const next = { ...item, ...updates };
        if ("imageWeek" in updates) {
          if (next.imageWeek != null && next.imageWeek !== briefWeek) {
            const index = items.findIndex((i) => i.id === id);
            next.exportPosition = index >= 0 ? index + 1 : null;
          } else {
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

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-muted-foreground">Bannières ({items.length})</h3>
        <Button variant="outline" size="sm" onClick={addItem}>
          <Plus className="mr-1 h-3 w-3" />
          Ajouter
        </Button>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={(e) => setActiveId(String(e.active.id))}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
            {items.map((item) => (
              <CatBannerItemEditor
                key={item.id}
                item={item}
                isActive={item.id === activeId}
                briefWeek={briefWeek}
                onUpdate={(updates) => updateItem(item.id, updates)}
                onRemove={() => removeItem(item.id)}
                onOpenMediaLibrary={(slot) => onOpenMediaLibrary(`${item.id}:${slot}`)}
                onDropFile={onDropFile ? (slot, file) => onDropFile(`${item.id}:${slot}`, file) : undefined}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {items.length === 0 && (
        <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
          Aucune bannière. Cliquez sur &quot;Ajouter&quot; pour commencer.
        </div>
      )}
    </div>
  );
}
