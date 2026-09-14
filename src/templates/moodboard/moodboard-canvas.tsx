"use client";

// Moteur de rendu + interaction du moodboard, partagé par l'éditeur et
// l'aperçu (même composant, juste `interactive` à false côté aperçu) — pas de
// génération de HTML à maintenir en parallèle comme pour les autres
// templates : ce qu'on voit ici EST le rendu final, il n'y a rien d'autre.

import { useState, type ReactNode } from "react";
import { Image as ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useFileDrop } from "@/lib/use-file-drop";
import type {
  MoodboardArrowElement,
  MoodboardContent,
  MoodboardElement,
  MoodboardImageElement,
  MoodboardShapeElement,
  MoodboardTextElement,
} from "@/types";

/**
 * Suit un geste pointeur jusqu'à son relâchement, en delta depuis le point de
 * départ. `onEnd` reçoit `moved` : false pour un simple clic (aucun
 * déplacement notable), ce qui permet de distinguer "sélectionner/cliquer" de
 * "faire glisser" sans dépendre de l'événement `click` natif (ambigu ici,
 * puisqu'un clic qui termine un vrai glissé le déclenche quand même).
 */
function startDrag(
  e: React.PointerEvent,
  onDelta: (dx: number, dy: number) => void,
  onEnd?: (moved: boolean) => void,
) {
  e.stopPropagation();
  const startX = e.clientX;
  const startY = e.clientY;
  let moved = false;
  const handleMove = (ev: PointerEvent) => {
    const dx = ev.clientX - startX;
    const dy = ev.clientY - startY;
    if (Math.abs(dx) > 2 || Math.abs(dy) > 2) moved = true;
    onDelta(dx, dy);
  };
  const handleUp = () => {
    window.removeEventListener("pointermove", handleMove);
    window.removeEventListener("pointerup", handleUp);
    onEnd?.(moved);
  };
  window.addEventListener("pointermove", handleMove);
  window.addEventListener("pointerup", handleUp);
}

interface BoxElementProps {
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
  interactive: boolean;
  selected: boolean;
  onSelect?: () => void;
  onMove?: (x: number, y: number) => void;
  onResize?: (width: number, height: number) => void;
  /** Clic sans glissé notable — ex: ouvrir la médiathèque sur une image vide. */
  onTap?: () => void;
  minWidth?: number;
  minHeight?: number;
  children: ReactNode;
}

/** Boîte déplaçable/redimensionnable partagée par texte, image et forme. */
function BoxElement({
  x,
  y,
  width,
  height,
  zIndex,
  interactive,
  selected,
  onSelect,
  onMove,
  onResize,
  onTap,
  minWidth = 40,
  minHeight = 30,
  children,
}: BoxElementProps) {
  return (
    <div
      style={{ position: "absolute", left: x, top: y, width, height, zIndex }}
      className={cn(interactive && "select-none", interactive && onMove && "cursor-move")}
      onPointerDown={(e) => {
        if (!interactive) return;
        onSelect?.();
        if (onMove) {
          startDrag(
            e,
            (dx, dy) => onMove(x + dx, y + dy),
            (moved) => {
              if (!moved) onTap?.();
            },
          );
        }
      }}
    >
      <div
        className={cn(
          "h-full w-full overflow-hidden",
          interactive && selected && "outline outline-2 outline-offset-2 outline-primary",
        )}
      >
        {children}
      </div>
      {interactive && selected && onResize && (
        <div
          onPointerDown={(e) =>
            startDrag(e, (dx, dy) =>
              onResize(Math.max(minWidth, width + dx), Math.max(minHeight, height + dy)),
            )
          }
          className="absolute -bottom-1.5 -right-1.5 h-3.5 w-3.5 cursor-nwse-resize rounded-full border-2 border-white bg-primary shadow"
        />
      )}
    </div>
  );
}

function TextElementView({
  el,
  interactive,
  selected,
  editing,
  onSelect,
  onStartEdit,
  onStopEdit,
  onMove,
  onResize,
  onTextChange,
}: {
  el: MoodboardTextElement;
  interactive: boolean;
  selected: boolean;
  editing: boolean;
  onSelect?: () => void;
  onStartEdit?: () => void;
  onStopEdit?: () => void;
  onMove?: (x: number, y: number) => void;
  onResize?: (width: number, height: number) => void;
  onTextChange?: (text: string) => void;
}) {
  const textStyle: React.CSSProperties = {
    color: el.color,
    fontSize: el.fontSize,
    fontWeight: el.bold ? 700 : 400,
    textAlign: el.align,
  };
  const justify = el.align === "center" ? "center" : el.align === "right" ? "flex-end" : "flex-start";

  return (
    <BoxElement
      x={el.x}
      y={el.y}
      width={el.width}
      height={el.height}
      zIndex={el.zIndex}
      interactive={interactive}
      selected={selected}
      onSelect={onSelect}
      onMove={editing ? undefined : onMove}
      onResize={onResize}
    >
      <div
        onDoubleClick={() => interactive && onStartEdit?.()}
        className="flex h-full w-full p-1.5"
        style={{ justifyContent: justify, alignItems: "flex-start" }}
      >
        {editing ? (
          <textarea
            autoFocus
            defaultValue={el.text}
            onFocus={(e) => e.currentTarget.select()}
            onPointerDown={(e) => e.stopPropagation()}
            onBlur={(e) => {
              onTextChange?.(e.target.value);
              onStopEdit?.();
            }}
            className="h-full w-full resize-none bg-transparent outline-none"
            style={textStyle}
          />
        ) : (
          <p className="w-full whitespace-pre-wrap break-words" style={textStyle}>
            {el.text || (interactive ? <span className="opacity-40">Double-clic pour écrire…</span> : "")}
          </p>
        )}
      </div>
    </BoxElement>
  );
}

function ImageElementView({
  el,
  interactive,
  selected,
  onSelect,
  onMove,
  onResize,
  onOpenMedia,
  onDropFile,
}: {
  el: MoodboardImageElement;
  interactive: boolean;
  selected: boolean;
  onSelect?: () => void;
  onMove?: (x: number, y: number) => void;
  onResize?: (width: number, height: number) => void;
  onOpenMedia?: () => void;
  onDropFile?: (file: File) => void;
}) {
  const { isDraggingOver, dropHandlers } = useFileDrop((file) => onDropFile?.(file));

  return (
    <BoxElement
      x={el.x}
      y={el.y}
      width={el.width}
      height={el.height}
      zIndex={el.zIndex}
      interactive={interactive}
      selected={selected}
      onSelect={onSelect}
      onMove={onMove}
      onResize={onResize}
      onTap={() => !el.imageUrl && onOpenMedia?.()}
    >
      <div
        {...(interactive ? dropHandlers : {})}
        className={cn(
          "flex h-full w-full items-center justify-center overflow-hidden border-2 border-dashed border-muted-foreground/20 bg-muted",
          interactive && !el.imageUrl && "hover:border-primary/40 hover:bg-primary/5",
          isDraggingOver && "border-primary bg-primary/10",
        )}
      >
        {el.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={el.imageUrl} alt="" className="h-full w-full object-cover" draggable={false} />
        ) : (
          <ImageIcon className="h-6 w-6 text-muted-foreground/40" />
        )}
      </div>
    </BoxElement>
  );
}

function ShapeElementView({
  el,
  interactive,
  selected,
  onSelect,
  onMove,
  onResize,
}: {
  el: MoodboardShapeElement;
  interactive: boolean;
  selected: boolean;
  onSelect?: () => void;
  onMove?: (x: number, y: number) => void;
  onResize?: (width: number, height: number) => void;
}) {
  return (
    <BoxElement
      x={el.x}
      y={el.y}
      width={el.width}
      height={el.height}
      zIndex={el.zIndex}
      interactive={interactive}
      selected={selected}
      onSelect={onSelect}
      onMove={onMove}
      onResize={onResize}
    >
      <div className="h-full w-full" style={{ backgroundColor: el.color, borderRadius: el.radius }} />
    </BoxElement>
  );
}

function ArrowElementView({
  el,
  interactive,
  selected,
  onSelect,
  onMoveWhole,
  onMoveStart,
  onMoveEnd,
}: {
  el: MoodboardArrowElement;
  interactive: boolean;
  selected: boolean;
  onSelect?: () => void;
  onMoveWhole?: (x1: number, y1: number, x2: number, y2: number) => void;
  onMoveStart?: (x1: number, y1: number) => void;
  onMoveEnd?: (x2: number, y2: number) => void;
}) {
  // Marge autour du trait : place pour la pointe de flèche et une zone de
  // clic confortable sans agrandir la boîte englobante à l'infini.
  const PAD = 14;
  const minX = Math.min(el.x1, el.x2) - PAD;
  const minY = Math.min(el.y1, el.y2) - PAD;
  const width = Math.abs(el.x2 - el.x1) + PAD * 2;
  const height = Math.abs(el.y2 - el.y1) + PAD * 2;
  const lx1 = el.x1 - minX;
  const ly1 = el.y1 - minY;
  const lx2 = el.x2 - minX;
  const ly2 = el.y2 - minY;
  const markerId = `moodboard-arrowhead-${el.id}`;

  return (
    <svg
      style={{ position: "absolute", left: minX, top: minY, width, height, zIndex: el.zIndex, overflow: "visible" }}
      className={interactive ? "cursor-move" : undefined}
      onPointerDown={(e) => {
        if (!interactive) return;
        onSelect?.();
        startDrag(e, (dx, dy) => onMoveWhole?.(el.x1 + dx, el.y1 + dy, el.x2 + dx, el.y2 + dy));
      }}
    >
      <defs>
        <marker id={markerId} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M0,0 L10,5 L0,10 z" fill={el.color} />
        </marker>
      </defs>
      {/* Zone cliquable invisible, plus large que le trait visible : plus
          facile à sélectionner/glisser qu'un trait fin de quelques pixels. */}
      <line x1={lx1} y1={ly1} x2={lx2} y2={ly2} stroke="transparent" strokeWidth={Math.max(el.strokeWidth, 16)} />
      <line
        x1={lx1}
        y1={ly1}
        x2={lx2}
        y2={ly2}
        stroke={el.color}
        strokeWidth={el.strokeWidth}
        markerEnd={`url(#${markerId})`}
      />
      {interactive && selected && (
        <>
          <circle
            cx={lx1}
            cy={ly1}
            r={6}
            fill="white"
            strokeWidth={2}
            style={{ stroke: "var(--primary)" }}
            className="cursor-grab"
            onPointerDown={(e) => {
              e.stopPropagation();
              startDrag(e, (dx, dy) => onMoveStart?.(el.x1 + dx, el.y1 + dy));
            }}
          />
          <circle
            cx={lx2}
            cy={ly2}
            r={6}
            fill="white"
            strokeWidth={2}
            style={{ stroke: "var(--primary)" }}
            className="cursor-grab"
            onPointerDown={(e) => {
              e.stopPropagation();
              startDrag(e, (dx, dy) => onMoveEnd?.(el.x2 + dx, el.y2 + dy));
            }}
          />
        </>
      )}
    </svg>
  );
}

export interface MoodboardCanvasProps {
  content: MoodboardContent;
  /** false pour l'aperçu : rendu identique, sans poignées ni édition. */
  interactive: boolean;
  selectedId?: string | null;
  onSelect?: (id: string | null) => void;
  onChange?: (content: MoodboardContent) => void;
  onOpenMedia?: (elementId: string) => void;
  onDropFile?: (elementId: string, file: File) => void;
}

export function MoodboardCanvas({
  content,
  interactive,
  selectedId = null,
  onSelect,
  onChange,
  onOpenMedia,
  onDropFile,
}: MoodboardCanvasProps) {
  const [editingTextId, setEditingTextId] = useState<string | null>(null);

  const updateElement = (id: string, patch: Record<string, unknown>) => {
    onChange?.({
      ...content,
      elements: content.elements.map((el) => (el.id === id ? ({ ...el, ...patch } as MoodboardElement) : el)),
    });
  };

  const sorted = [...content.elements].sort((a, b) => a.zIndex - b.zIndex);

  return (
    <div
      style={{ width: content.canvasWidth, height: content.canvasHeight, backgroundColor: content.backgroundColor }}
      className="relative shrink-0"
      onPointerDown={() => interactive && onSelect?.(null)}
    >
      {sorted.map((el) => {
        const selected = interactive && selectedId === el.id;
        const select = () => onSelect?.(el.id);
        switch (el.type) {
          case "text":
            return (
              <TextElementView
                key={el.id}
                el={el}
                interactive={interactive}
                selected={selected}
                editing={editingTextId === el.id}
                onSelect={select}
                onStartEdit={() => setEditingTextId(el.id)}
                onStopEdit={() => setEditingTextId(null)}
                onMove={(x, y) => updateElement(el.id, { x, y })}
                onResize={(width, height) => updateElement(el.id, { width, height })}
                onTextChange={(text) => updateElement(el.id, { text })}
              />
            );
          case "image":
            return (
              <ImageElementView
                key={el.id}
                el={el}
                interactive={interactive}
                selected={selected}
                onSelect={select}
                onMove={(x, y) => updateElement(el.id, { x, y })}
                onResize={(width, height) => updateElement(el.id, { width, height })}
                onOpenMedia={() => onOpenMedia?.(el.id)}
                onDropFile={(file) => onDropFile?.(el.id, file)}
              />
            );
          case "shape":
            return (
              <ShapeElementView
                key={el.id}
                el={el}
                interactive={interactive}
                selected={selected}
                onSelect={select}
                onMove={(x, y) => updateElement(el.id, { x, y })}
                onResize={(width, height) => updateElement(el.id, { width, height })}
              />
            );
          case "arrow":
            return (
              <ArrowElementView
                key={el.id}
                el={el}
                interactive={interactive}
                selected={selected}
                onSelect={select}
                onMoveWhole={(x1, y1, x2, y2) => updateElement(el.id, { x1, y1, x2, y2 })}
                onMoveStart={(x1, y1) => updateElement(el.id, { x1, y1 })}
                onMoveEnd={(x2, y2) => updateElement(el.id, { x2, y2 })}
              />
            );
        }
      })}
    </div>
  );
}
