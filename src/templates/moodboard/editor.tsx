"use client";

import { useEffect, useState } from "react";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  BringToFront,
  Copy,
  Image as ImageIcon,
  MoveUpRight,
  SendToBack,
  Square,
  Trash2,
  Type,
} from "lucide-react";
import { v4 as uuidv4 } from "uuid";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { MoodboardContent, MoodboardElement } from "@/types";
import { createArrowElement, createImageElement, createShapeElement, createTextElement } from "./schema";
import { MoodboardCanvas } from "./moodboard-canvas";

interface MoodboardEditorProps {
  content: MoodboardContent;
  onChange: (content: MoodboardContent) => void;
  onOpenMedia: (elementId: string) => void;
  onDropFile: (elementId: string, file: File) => void;
}

// Décale chaque nouvel élément pour qu'ils n'atterrissent pas tous exactement
// au même endroit — sans complexité de placement automatique.
function cascadePosition(count: number): { x: number; y: number } {
  const step = count % 6;
  return { x: 40 + step * 24, y: 40 + step * 24 };
}

export function MoodboardEditor({ content, onChange, onOpenMedia, onDropFile }: MoodboardEditorProps) {
  const [selectedId, onSelectedIdChange] = useState<string | null>(null);
  const selected = content.elements.find((e) => e.id === selectedId) ?? null;

  const addElement = (factory: (elements: MoodboardElement[], x: number, y: number) => MoodboardElement) => {
    const { x, y } = cascadePosition(content.elements.length);
    const el = factory(content.elements, x, y);
    onChange({ ...content, elements: [...content.elements, el] });
    onSelectedIdChange(el.id);
  };

  const updateSelected = (patch: Record<string, unknown>) => {
    if (!selected) return;
    onChange({
      ...content,
      elements: content.elements.map((e) => (e.id === selected.id ? ({ ...e, ...patch } as MoodboardElement) : e)),
    });
  };

  const deleteSelected = () => {
    if (!selected) return;
    onChange({ ...content, elements: content.elements.filter((e) => e.id !== selected.id) });
    onSelectedIdChange(null);
  };

  const duplicateSelected = () => {
    if (!selected) return;
    const maxZ = Math.max(0, ...content.elements.map((e) => e.zIndex));
    const offset = "x" in selected ? { x: selected.x + 24, y: selected.y + 24 } : { x1: selected.x1 + 24, y1: selected.y1 + 24, x2: selected.x2 + 24, y2: selected.y2 + 24 };
    const copy = { ...selected, ...offset, id: uuidv4(), zIndex: maxZ + 1 } as MoodboardElement;
    onChange({ ...content, elements: [...content.elements, copy] });
    onSelectedIdChange(copy.id);
  };

  const bringToFront = () => {
    if (!selected) return;
    const maxZ = Math.max(0, ...content.elements.map((e) => e.zIndex));
    updateSelected({ zIndex: maxZ + 1 });
  };
  const sendToBack = () => {
    if (!selected) return;
    const minZ = Math.min(0, ...content.elements.map((e) => e.zIndex));
    updateSelected({ zIndex: minZ - 1 });
  };

  // Suppr/Retour arrière supprime l'élément sélectionné — sauf si le focus
  // est dans un champ texte (édition d'un texte, saisie du commentaire...),
  // sans quoi la touche serait interceptée avant d'effacer un caractère.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!selectedId) return;
      if ((e.key !== "Delete" && e.key !== "Backspace") || !selectedId) return;
      const tag = document.activeElement?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      e.preventDefault();
      deleteSelected();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, content]);

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" size="sm" onClick={() => addElement(createTextElement)}>
          <Type className="mr-1 h-3.5 w-3.5" />
          Texte
        </Button>
        <Button variant="outline" size="sm" onClick={() => addElement(createImageElement)}>
          <ImageIcon className="mr-1 h-3.5 w-3.5" />
          Image
        </Button>
        <Button variant="outline" size="sm" onClick={() => addElement(createShapeElement)}>
          <Square className="mr-1 h-3.5 w-3.5" />
          Forme
        </Button>
        <Button variant="outline" size="sm" onClick={() => addElement(createArrowElement)}>
          <MoveUpRight className="mr-1 h-3.5 w-3.5" />
          Flèche
        </Button>
        <span className="ml-auto flex items-center gap-1.5 text-[11px] text-muted-foreground">
          Fond
          <input
            type="color"
            value={content.backgroundColor}
            onChange={(e) => onChange({ ...content, backgroundColor: e.target.value })}
            className="h-6 w-8 cursor-pointer rounded border border-input bg-transparent p-0.5"
            title="Couleur de fond du tableau"
          />
        </span>
      </div>

      <div className="flex min-h-9 flex-wrap items-center gap-2 rounded-md bg-muted/40 px-2 py-1.5">
        {!selected ? (
          <span className="text-[11px] text-muted-foreground">
            Cliquez un élément pour le modifier — glissez pour le déplacer, la poignée pour le redimensionner.
          </span>
        ) : (
          <>
            {selected.type === "text" && (
              <>
                <input
                  type="color"
                  value={selected.color}
                  onChange={(e) => updateSelected({ color: e.target.value })}
                  className="h-6 w-8 cursor-pointer rounded border border-input bg-transparent p-0.5"
                  title="Couleur du texte"
                />
                <input
                  type="number"
                  min={10}
                  max={96}
                  value={selected.fontSize}
                  onChange={(e) => updateSelected({ fontSize: Number(e.target.value) || selected.fontSize })}
                  className="h-6 w-14 rounded border border-input bg-transparent px-1.5 text-xs"
                  title="Taille du texte"
                />
                <Button
                  variant={selected.bold ? "default" : "outline"}
                  size="icon-sm"
                  onClick={() => updateSelected({ bold: !selected.bold })}
                  title="Gras"
                >
                  <Bold className="h-3.5 w-3.5" />
                </Button>
                {(["left", "center", "right"] as const).map((align) => {
                  const Icon = align === "left" ? AlignLeft : align === "center" ? AlignCenter : AlignRight;
                  return (
                    <Button
                      key={align}
                      variant={selected.align === align ? "default" : "outline"}
                      size="icon-sm"
                      onClick={() => updateSelected({ align })}
                      title={`Aligner à ${align === "left" ? "gauche" : align === "center" ? "centre" : "droite"}`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                    </Button>
                  );
                })}
              </>
            )}
            {selected.type === "image" && (
              <Button variant="outline" size="sm" onClick={() => onOpenMedia(selected.id)}>
                <ImageIcon className="mr-1 h-3.5 w-3.5" />
                {selected.imageUrl ? "Changer l'image" : "Choisir une image"}
              </Button>
            )}
            {selected.type === "shape" && (
              <>
                <input
                  type="color"
                  value={selected.color}
                  onChange={(e) => updateSelected({ color: e.target.value })}
                  className="h-6 w-8 cursor-pointer rounded border border-input bg-transparent p-0.5"
                  title="Couleur de la forme"
                />
                <input
                  type="number"
                  min={0}
                  max={200}
                  value={selected.radius}
                  onChange={(e) => updateSelected({ radius: Number(e.target.value) || 0 })}
                  className="h-6 w-14 rounded border border-input bg-transparent px-1.5 text-xs"
                  title="Rayon des angles"
                />
              </>
            )}
            {selected.type === "arrow" && (
              <>
                <input
                  type="color"
                  value={selected.color}
                  onChange={(e) => updateSelected({ color: e.target.value })}
                  className="h-6 w-8 cursor-pointer rounded border border-input bg-transparent p-0.5"
                  title="Couleur de la flèche"
                />
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={selected.strokeWidth}
                  onChange={(e) => updateSelected({ strokeWidth: Number(e.target.value) || 1 })}
                  className="h-6 w-14 rounded border border-input bg-transparent px-1.5 text-xs"
                  title="Épaisseur du trait"
                />
              </>
            )}

            <span className="ml-auto flex items-center gap-1">
              <Button variant="ghost" size="icon-sm" onClick={sendToBack} title="Envoyer à l'arrière-plan">
                <SendToBack className="h-3.5 w-3.5" />
              </Button>
              <Button variant="ghost" size="icon-sm" onClick={bringToFront} title="Mettre au premier plan">
                <BringToFront className="h-3.5 w-3.5" />
              </Button>
              <Button variant="ghost" size="icon-sm" onClick={duplicateSelected} title="Dupliquer">
                <Copy className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={deleteSelected}
                title="Supprimer"
                className="hover:text-destructive"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </span>
          </>
        )}
      </div>

      <div
        className={cn(
          "overflow-auto rounded-lg border border-border/60 bg-muted/20",
          "max-h-[480px]",
        )}
      >
        <MoodboardCanvas
          content={content}
          interactive
          selectedId={selectedId}
          onSelect={onSelectedIdChange}
          onChange={onChange}
          onOpenMedia={onOpenMedia}
          onDropFile={onDropFile}
        />
      </div>

      <div className="space-y-1">
        <span className="text-[11px] text-muted-foreground">commentaire</span>
        <Textarea
          placeholder="commentaire..."
          value={content.comment}
          onChange={(e) => onChange({ ...content, comment: e.target.value })}
          rows={2}
          className="min-h-10 resize-none text-sm"
        />
      </div>
    </div>
  );
}
