"use client";

import { useEffect, useRef, useState } from "react";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  BringToFront,
  Copy,
  Image as ImageIcon,
  Loader2,
  MoveUpRight,
  SendToBack,
  Square,
  Trash2,
  Type,
} from "lucide-react";
import { v4 as uuidv4 } from "uuid";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { postAsset } from "@/lib/post-asset";
import { validateSourceFile } from "@/lib/upload-specs";
import type { MoodboardContent, MoodboardElement } from "@/types";
import {
  createArrowElement,
  createImageElement,
  createShapeElement,
  createTextElement,
  fitWithin,
} from "./schema";
import { MoodboardCanvas } from "./moodboard-canvas";

// Cadre dans lequel une capture collée est réduite : la moitié du tableau,
// assez pour la voir, sans masquer le reste de la composition.
const PASTE_MAX_WIDTH = 640;
const PASTE_MAX_HEIGHT = 360;

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
  const [pasting, setPasting] = useState(false);

  // Contenu le plus récent, lu à la fin d'un envoi asynchrone : l'utilisateur
  // a pu déplacer ou modifier des éléments pendant l'upload, et repartir du
  // `content` capturé au moment du collage effacerait ces changements.
  const contentRef = useRef(content);
  useEffect(() => {
    contentRef.current = content;
  });

  // Ctrl+V d'une capture d'écran. Écouté sur le conteneur du moodboard (et non
  // sur toute la page) : seul le tableau sur lequel on vient de cliquer reçoit
  // l'image, même s'il y en a plusieurs dans le brief. Le collage dans un champ
  // texte (texte d'un élément, commentaire, réglages) reste un collage normal.
  const handlePaste = async (e: React.ClipboardEvent) => {
    const target = e.target as HTMLElement;
    if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) return;
    const file = Array.from(e.clipboardData.items)
      .find((item) => item.kind === "file" && item.type.startsWith("image/"))
      ?.getAsFile();
    if (!file) return;
    e.preventDefault();

    const error = validateSourceFile(file);
    if (error) {
      toast.error(error);
      return;
    }

    setPasting(true);
    try {
      const bitmap = await createImageBitmap(file);
      const size = fitWithin(bitmap.width, bitmap.height, PASTE_MAX_WIDTH, PASTE_MAX_HEIGHT);
      bitmap.close();

      const res = await postAsset(file, {
        label: `Capture ${new Date().toLocaleString("fr-FR")}`,
        week: null,
        year: null,
        type: "moodboard",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        toast.error(data?.error ?? "Impossible d'importer la capture");
        return;
      }
      const asset = await res.json();

      const latest = contentRef.current;
      const { x, y } = cascadePosition(latest.elements.length);
      const el: MoodboardElement = {
        ...createImageElement(latest.elements, x, y),
        ...size,
        imageUrl: asset.url,
      };
      onChange({ ...latest, elements: [...latest.elements, el] });
      onSelectedIdChange(el.id);
      toast.success("Capture ajoutée au tableau");
    } catch {
      toast.error("Impossible d'importer la capture");
    } finally {
      setPasting(false);
    }
  };

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
    // tabIndex -1 : un clic dans le tableau lui donne le focus, condition pour
    // qu'il reçoive l'événement de collage (cf. handlePaste).
    <div className="space-y-2 outline-none" tabIndex={-1} onPaste={handlePaste}>
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
        {pasting && (
          <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" />
            Import de la capture…
          </span>
        )}
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
            Cliquez un élément pour le modifier — glissez pour le déplacer, la poignée pour le
            redimensionner. Cliquez sur le tableau puis Ctrl+V pour coller une capture d&apos;écran.
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
