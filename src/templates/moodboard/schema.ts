import { v4 as uuidv4 } from "uuid";
import { withDefaults } from "@/lib/normalize-content";
import type {
  MoodboardArrowElement,
  MoodboardContent,
  MoodboardElement,
  MoodboardImageElement,
  MoodboardShapeElement,
  MoodboardTextElement,
} from "@/types";

// Format diapositive (16:9) : assez grand pour composer librement, sans
// contrainte CMS puisque ce template n'exporte rien.
export const MOODBOARD_WIDTH = 1280;
export const MOODBOARD_HEIGHT = 720;

/**
 * Taille d'affichage d'une image collée : ses proportions d'origine, réduites
 * pour tenir dans le cadre donné, jamais agrandies. Une capture plein écran
 * collée à sa taille réelle recouvrirait tout le tableau.
 */
export function fitWithin(width: number, height: number, maxWidth: number, maxHeight: number) {
  const scale = Math.min(1, maxWidth / width, maxHeight / height);
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
}

function nextZIndex(elements: MoodboardElement[]): number {
  return elements.length === 0 ? 1 : Math.max(...elements.map((e) => e.zIndex)) + 1;
}

export function createTextElement(elements: MoodboardElement[], x: number, y: number): MoodboardTextElement {
  return {
    id: uuidv4(),
    type: "text",
    zIndex: nextZIndex(elements),
    x,
    y,
    width: 260,
    height: 90,
    text: "Texte",
    color: "#18181b",
    fontSize: 20,
    bold: false,
    align: "left",
  };
}

export function createImageElement(elements: MoodboardElement[], x: number, y: number): MoodboardImageElement {
  return {
    id: uuidv4(),
    type: "image",
    zIndex: nextZIndex(elements),
    x,
    y,
    width: 280,
    height: 200,
    imageUrl: "",
    imageId: uuidv4().slice(0, 8),
  };
}

export function createShapeElement(elements: MoodboardElement[], x: number, y: number): MoodboardShapeElement {
  return {
    id: uuidv4(),
    type: "shape",
    zIndex: nextZIndex(elements),
    x,
    y,
    width: 220,
    height: 130,
    color: "#c7d4da",
    radius: 8,
  };
}

export function createArrowElement(elements: MoodboardElement[], x: number, y: number): MoodboardArrowElement {
  return {
    id: uuidv4(),
    type: "arrow",
    zIndex: nextZIndex(elements),
    x1: x,
    y1: y,
    x2: x + 180,
    y2: y,
    color: "#18181b",
    strokeWidth: 3,
  };
}

export function createEmptyMoodboardContent(): MoodboardContent {
  return {
    canvasWidth: MOODBOARD_WIDTH,
    canvasHeight: MOODBOARD_HEIGHT,
    backgroundColor: "#ffffff",
    elements: [],
    comment: "",
  };
}

// Un élément dont le "type" ne correspond à rien de connu est écarté plutôt
// que de faire planter tout le moodboard — le contenu est du JSON non validé.
function normalizeElement(raw: unknown): MoodboardElement | null {
  if (!raw || typeof raw !== "object") return null;
  const el = raw as Record<string, unknown>;
  const id = typeof el.id === "string" ? el.id : uuidv4();
  const zIndex = typeof el.zIndex === "number" ? el.zIndex : 0;
  const num = (v: unknown, fallback: number) => (typeof v === "number" ? v : fallback);
  const str = (v: unknown, fallback: string) => (typeof v === "string" ? v : fallback);

  switch (el.type) {
    case "text":
      return {
        id,
        type: "text",
        zIndex,
        x: num(el.x, 0),
        y: num(el.y, 0),
        width: num(el.width, 260),
        height: num(el.height, 90),
        text: str(el.text, ""),
        color: str(el.color, "#18181b"),
        fontSize: num(el.fontSize, 20),
        bold: el.bold === true,
        align: el.align === "center" || el.align === "right" ? el.align : "left",
      };
    case "image":
      return {
        id,
        type: "image",
        zIndex,
        x: num(el.x, 0),
        y: num(el.y, 0),
        width: num(el.width, 280),
        height: num(el.height, 200),
        imageUrl: str(el.imageUrl, ""),
        imageId: str(el.imageId, uuidv4().slice(0, 8)),
      };
    case "shape":
      return {
        id,
        type: "shape",
        zIndex,
        x: num(el.x, 0),
        y: num(el.y, 0),
        width: num(el.width, 220),
        height: num(el.height, 130),
        color: str(el.color, "#c7d4da"),
        radius: num(el.radius, 8),
      };
    case "arrow":
      return {
        id,
        type: "arrow",
        zIndex,
        x1: num(el.x1, 0),
        y1: num(el.y1, 0),
        x2: num(el.x2, 180),
        y2: num(el.y2, 0),
        color: str(el.color, "#18181b"),
        strokeWidth: num(el.strokeWidth, 3),
      };
    default:
      return null;
  }
}

export function normalizeMoodboardContent(content: unknown): MoodboardContent {
  const merged = withDefaults(createEmptyMoodboardContent(), content as Partial<MoodboardContent>);
  const rawElements = (content as { elements?: unknown })?.elements;
  return {
    ...merged,
    elements: Array.isArray(rawElements)
      ? rawElements.map(normalizeElement).filter((e): e is MoodboardElement => e !== null)
      : [],
  };
}
