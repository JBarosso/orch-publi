"use client";

import { useCallback, useMemo } from "react";
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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { v4 as uuidv4 } from "uuid";
import type { ArianeContent } from "@/types";
import { createEmptyArianeLink } from "./schema";
import { ArianeLinkEditor } from "./ariane-link-editor";
import { cn } from "@/lib/utils";

interface ArianeEditorProps {
  content: ArianeContent;
  onChange: (content: ArianeContent) => void;
}

export function ArianeEditor({ content, onChange }: ArianeEditorProps) {
  const links = useMemo(() => content.links ?? [], [content.links]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (over && active.id !== over.id) {
        const oldIndex = links.findIndex((l) => l.id === active.id);
        const newIndex = links.findIndex((l) => l.id === over.id);
        onChange({ ...content, links: arrayMove(links, oldIndex, newIndex) });
      }
    },
    [links, content, onChange],
  );

  const addLink = () => {
    onChange({ ...content, links: [...links, createEmptyArianeLink(uuidv4())] });
  };

  const updateLink = (id: string, updates: Partial<(typeof links)[number]>) => {
    onChange({ ...content, links: links.map((l) => (l.id === id ? { ...l, ...updates } : l)) });
  };

  const removeLink = (id: string) => {
    onChange({ ...content, links: links.filter((l) => l.id !== id) });
  };

  return (
    <div className="space-y-3">
      <Input
        placeholder="Titre (ex: Bébé 0-36 mois)"
        value={content.title}
        onChange={(e) => onChange({ ...content, title: e.target.value })}
        className="h-9 text-sm font-semibold"
      />

      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-muted-foreground">Liens ({links.length})</h3>
        <Button variant="outline" size="sm" onClick={addLink}>
          <Plus className="mr-1 h-3 w-3" />
          Ajouter
        </Button>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={links.map((l) => l.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-1.5">
            {links.map((link) => (
              <ArianeLinkEditor
                key={link.id}
                link={link}
                onUpdate={(updates) => updateLink(link.id, updates)}
                onRemove={() => removeLink(link.id)}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {links.length === 0 && (
        <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
          Aucun lien. Cliquez sur &quot;Ajouter&quot; pour commencer.
        </div>
      )}

      <div className="space-y-1 pt-1">
        <span className="text-[11px] text-muted-foreground">commentaire</span>
        <Textarea
          placeholder="commentaire..."
          value={content.comment ?? ""}
          onChange={(e) => onChange({ ...content, comment: e.target.value })}
          rows={2}
          className={cn(
            "min-h-10 resize-none text-sm",
            (content.comment ?? "").trim()
              ? "border-red-500 border-l-[3px]! border-l-red-500! focus-visible:ring-2 focus-visible:ring-red-500/40"
              : "",
          )}
        />
      </div>
    </div>
  );
}
