"use client";

import { useCallback, useMemo, useState } from "react";
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
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  GripVertical,
  Heading2,
  Image as ImageIcon,
  MousePointerClick,
  Plus,
  Text as TextIcon,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { CustomBlock, CustomBlockType, CustomContent, CustomLayout } from "@/types";
import { CUSTOM_BLOCK_LABELS, CUSTOM_LAYOUTS } from "@/types";
import { createEmptyBlock } from "./schema";
import { useFileDrop } from "@/lib/use-file-drop";

interface CustomEditorProps {
  content: CustomContent;
  briefWeek?: number;
  onChange: (content: CustomContent) => void;
  onOpenMediaLibrary: (blockId: string) => void;
  onDropFile?: (blockId: string, file: File) => void;
  /** Commentaire dev au niveau de la section (masqué dans l'éditeur de template) */
  showComment?: boolean;
}

const ADD_BUTTONS: { type: CustomBlockType; icon: typeof Heading2 }[] = [
  { type: "title", icon: Heading2 },
  { type: "text", icon: TextIcon },
  { type: "image", icon: ImageIcon },
  { type: "button", icon: MousePointerClick },
];

export function CustomEditor({
  content,
  briefWeek,
  onChange,
  onOpenMediaLibrary,
  onDropFile,
  showComment = true,
}: CustomEditorProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const blocks = useMemo(() => content.blocks ?? [], [content.blocks]);

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
        const oldIndex = blocks.findIndex((b) => b.id === active.id);
        const newIndex = blocks.findIndex((b) => b.id === over.id);
        onChange({ ...content, blocks: arrayMove(blocks, oldIndex, newIndex) });
      }
    },
    [blocks, content, onChange],
  );

  const addBlock = (type: CustomBlockType) => {
    onChange({ ...content, blocks: [...blocks, createEmptyBlock(type)] });
  };

  const updateBlock = (id: string, updates: Partial<CustomBlock>) => {
    onChange({
      ...content,
      blocks: blocks.map((b) => (b.id === id ? { ...b, ...updates } : b)),
    });
  };

  const removeBlock = (id: string) => {
    onChange({ ...content, blocks: blocks.filter((b) => b.id !== id) });
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-muted-foreground shrink-0">Layout</span>
          <Select
            value={content.layout}
            items={CUSTOM_LAYOUTS}
            onValueChange={(v) =>
              v && onChange({ ...content, layout: v as CustomLayout })
            }
          >
            <SelectTrigger className="h-8 w-64 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CUSTOM_LAYOUTS.map((layout) => (
                <SelectItem key={layout.value} value={layout.value}>
                  {layout.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {ADD_BUTTONS.map(({ type, icon: Icon }) => (
            <Button
              key={type}
              variant="outline"
              size="sm"
              className="h-8"
              onClick={() => addBlock(type)}
            >
              <Plus className="mr-1 h-3 w-3" />
              <Icon className="mr-1 h-3.5 w-3.5" />
              {CUSTOM_BLOCK_LABELS[type]}
            </Button>
          ))}
        </div>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={(e) => setActiveId(String(e.active.id))}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={blocks.map((b) => b.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-2">
            {blocks.map((block) => (
              <CustomBlockEditor
                key={block.id}
                block={block}
                isActive={block.id === activeId}
                briefWeek={briefWeek}
                onUpdate={(updates) => updateBlock(block.id, updates)}
                onRemove={() => removeBlock(block.id)}
                onOpenMediaLibrary={() => onOpenMediaLibrary(block.id)}
                onDropFile={onDropFile ? (file) => onDropFile(block.id, file) : undefined}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {blocks.length === 0 && (
        <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
          Aucun bloc. Ajoutez un titre, un texte, une image ou un bouton.
        </div>
      )}

      {showComment && (
        <div className="space-y-1">
          <span className="text-[11px] text-muted-foreground">
            commentaire (section)
          </span>
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
      )}
    </div>
  );
}

interface CustomBlockEditorProps {
  block: CustomBlock;
  isActive: boolean;
  briefWeek?: number;
  onUpdate: (updates: Partial<CustomBlock>) => void;
  onRemove: () => void;
  onOpenMediaLibrary: () => void;
  onDropFile?: (file: File) => void;
}

function CustomBlockEditor({
  block,
  isActive,
  briefWeek,
  onUpdate,
  onRemove,
  onOpenMediaLibrary,
  onDropFile,
}: CustomBlockEditorProps) {
  const { isDraggingOver, dropHandlers } = useFileDrop((file) => onDropFile?.(file));
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: block.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-start gap-3 rounded-lg border border-border/60 bg-card p-3 transition-all",
        isDragging && "shadow-lg opacity-50 scale-[1.02]",
        isActive && "ring-2 ring-primary/30",
      )}
    >
      <button
        type="button"
        className="mt-1.5 cursor-grab touch-none text-muted-foreground/40 hover:text-muted-foreground transition-colors"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </button>

      <div className="min-w-0 flex-1 space-y-1.5">
        <span className="inline-block rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          {CUSTOM_BLOCK_LABELS[block.type]}
        </span>

        {block.type === "title" && (
          <Input
            placeholder="Titre de la section"
            value={block.text}
            onChange={(e) => onUpdate({ text: e.target.value })}
            className="h-8 text-sm"
          />
        )}

        {block.type === "text" && (
          <Textarea
            placeholder="Texte (Enter = saut de ligne)"
            value={block.text}
            onChange={(e) => onUpdate({ text: e.target.value })}
            rows={3}
            className="min-h-16 resize-none text-sm"
          />
        )}

        {block.type === "image" && (
          <div className="flex flex-wrap items-start gap-3">
            <button
              type="button"
              onClick={onOpenMediaLibrary}
              {...dropHandlers}
              className={cn(
                "shrink-0 flex h-20 w-32 items-center justify-center overflow-hidden rounded-md border-2 border-dashed border-muted-foreground/20 bg-muted transition-all hover:border-primary/40 hover:bg-primary/5",
                isDraggingOver && "border-primary bg-primary/10 ring-2 ring-primary/30",
              )}
            >
              {block.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={block.imageUrl}
                  alt={block.text}
                  className="h-full w-full object-cover"
                />
              ) : (
                <ImageIcon className="h-4 w-4 text-muted-foreground/40" />
              )}
            </button>
            <div className="min-w-[220px] flex-1 space-y-1.5">
              <Input
                placeholder="Texte alternatif (optionnel)"
                value={block.text}
                onChange={(e) => onUpdate({ text: e.target.value })}
                className="h-8 text-sm"
              />
              <div className="flex items-center gap-2">
                {briefWeek != null && (
                  <>
                    <span className="text-[10px] text-muted-foreground/70 shrink-0">
                      Semaine
                    </span>
                    <Input
                      type="number"
                      value={block.imageWeek ?? briefWeek}
                      onChange={(e) =>
                        onUpdate({
                          imageWeek: e.target.value
                            ? Number(e.target.value)
                            : null,
                        })
                      }
                      min={1}
                      max={53}
                      className="h-8 w-24 text-sm"
                    />
                  </>
                )}
                <span
                  className="text-[10px] text-muted-foreground/50 truncate"
                  title={block.imageId}
                >
                  ID: {block.imageId}
                </span>
              </div>
            </div>
          </div>
        )}

        {block.type === "button" && (
          <div className="space-y-1.5">
            <Input
              placeholder="Libellé du bouton"
              value={block.text}
              onChange={(e) => onUpdate({ text: e.target.value })}
              className="h-8 text-sm"
            />
            <div className="flex items-center gap-2">
              <Select
                value={block.linkType}
                items={{ cgid: "cgid", cid: "cid", url: "URL" }}
                onValueChange={(v) =>
                  v && onUpdate({ linkType: v as "cgid" | "url" | "cid" })
                }
              >
                <SelectTrigger className="h-8 w-28 shrink-0 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cgid">cgid</SelectItem>
                  <SelectItem value="cid">cid</SelectItem>
                  <SelectItem value="url">URL</SelectItem>
                </SelectContent>
              </Select>
              {block.linkType === "cgid" ? (
                <Input
                  placeholder="ex: outlet, collection-t-shirts"
                  value={block.cgid}
                  onChange={(e) => onUpdate({ cgid: e.target.value })}
                  className="h-8 text-sm"
                />
              ) : block.linkType === "cid" ? (
                <Input
                  placeholder="ex: aide-faq, content-page-id"
                  value={block.cid}
                  onChange={(e) => onUpdate({ cid: e.target.value })}
                  className="h-8 text-sm"
                />
              ) : (
                <Input
                  placeholder="https://..."
                  value={block.link}
                  onChange={(e) => onUpdate({ link: e.target.value })}
                  className="h-8 text-sm"
                />
              )}
            </div>
          </div>
        )}
      </div>

      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6 shrink-0 text-muted-foreground/40 hover:text-destructive"
        onClick={onRemove}
        title="Supprimer le bloc"
      >
        <Trash2 className="h-3 w-3" />
      </Button>
    </div>
  );
}
