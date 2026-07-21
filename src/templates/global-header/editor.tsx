"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
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
import { cn } from "@/lib/utils";
import type { GlobalHeaderContent, GlobalHeaderItem, Locale } from "@/types";
import type { HeaderColor } from "@/lib/header-colors";
import { createEmptyGlobalHeaderItem, MAX_GLOBAL_HEADER_ITEMS } from "./schema";
import { GlobalHeaderItemEditor } from "./global-header-item-editor";

interface GlobalHeaderEditorProps {
  content: GlobalHeaderContent;
  locale: Locale;
  onChange: (content: GlobalHeaderContent) => void;
}

export function GlobalHeaderEditor({ content, locale, onChange }: GlobalHeaderEditorProps) {
  const items = useMemo(() => content.items ?? [], [content.items]);
  const [recommendedColors, setRecommendedColors] = useState<HeaderColor[]>([]);

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/settings");
      if (res.ok) setRecommendedColors((await res.json()).headerColors ?? []);
    })();
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (over && active.id !== over.id) {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        onChange({ ...content, items: arrayMove(items, oldIndex, newIndex) });
      }
    },
    [items, content, onChange],
  );

  const addItem = () => {
    if (items.length >= MAX_GLOBAL_HEADER_ITEMS) return;
    onChange({ ...content, items: [...items, createEmptyGlobalHeaderItem()] });
  };

  const updateItem = (id: string, updates: Partial<GlobalHeaderItem>) => {
    onChange({
      ...content,
      items: items.map((item) => (item.id === id ? { ...item, ...updates } : item)),
    });
  };

  const removeItem = (id: string) => {
    onChange({ ...content, items: items.filter((item) => item.id !== id) });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-1.5 rounded-lg border border-border/60 bg-card p-3">
        <span className="text-xs font-semibold text-muted-foreground">
          Couleur du bandeau (toute la section, pas par item)
        </span>
        <div className="flex flex-wrap items-center gap-1.5">
          {recommendedColors.map((c) => (
            <button
              key={c.hex}
              type="button"
              title={c.name}
              onClick={() => onChange({ ...content, bgColor: c.hex })}
              className={cn(
                "h-7 w-7 shrink-0 rounded-full border-2 transition-all",
                content.bgColor.toLowerCase() === c.hex.toLowerCase()
                  ? "border-foreground"
                  : "border-transparent hover:border-muted-foreground/40",
              )}
              style={{ backgroundColor: c.hex }}
            />
          ))}
          <input
            type="color"
            value={content.bgColor}
            onChange={(e) => onChange({ ...content, bgColor: e.target.value })}
            title="Couleur personnalisée"
            className="h-7 w-9 cursor-pointer rounded border border-input bg-transparent p-0.5"
          />
          <span className="font-mono text-xs text-muted-foreground">{content.bgColor}</span>
        </div>
        <p className="text-[10px] text-muted-foreground/70">
          Le texte passe automatiquement en blanc ou noir selon le contraste.
          Couleurs recommandées modifiables dans Paramétrage.
        </p>
      </div>

      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-muted-foreground">
          Items ({items.length}/{MAX_GLOBAL_HEADER_ITEMS})
        </h3>
        <Button variant="outline" size="sm" onClick={addItem} disabled={items.length >= MAX_GLOBAL_HEADER_ITEMS}>
          <Plus className="mr-1 h-3 w-3" />
          Ajouter
        </Button>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
            {items.map((item, index) => (
              <GlobalHeaderItemEditor
                key={item.id}
                item={item}
                label={`Item ${index + 1}${index === 0 ? " (actif au chargement)" : ""}`}
                locale={locale}
                onUpdate={(updates) => updateItem(item.id, updates)}
                onRemove={() => removeItem(item.id)}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {items.length === 0 && (
        <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
          Aucun item. Cliquez sur &quot;Ajouter&quot; pour commencer.
        </div>
      )}
    </div>
  );
}
