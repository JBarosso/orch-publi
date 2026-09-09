import type { CarouselContent, CustomContent, MeaV2Content } from "@/types";

// À la duplication d'un brief vers une AUTRE semaine, un item dont l'image
// était "native" de la semaine source (imageWeek non renseigné, ou égal à la
// semaine source) doit être figé : il continue de pointer vers la semaine et
// la position où le fichier existe réellement, plutôt que de glisser
// silencieusement vers la nouvelle semaine du brief dupliqué (ce qui casse
// le lien vers un fichier jamais réuploadé). Un item déjà figé sur une
// semaine antérieure (imageWeek différent de la semaine source) est laissé
// tel quel — on ne fige qu'une fois, à l'origine réelle de la référence.
//
// Ce fichier est une bibliothèque de COMPORTEMENTS : chaque template choisit
// le sien dans le registre (`src/templates/registry.ts`). Trois suffisent
// pour la plupart des cas, les autres sont des variantes spécifiques.

interface Positionable {
  id: string;
  visible: boolean;
  imageWeek: number | null;
  exportPosition: number | null;
}

interface WeekOnly {
  imageWeek: number | null;
}

function isNative(imageWeek: number | null, originalWeek: number): boolean {
  return imageWeek == null || imageWeek === originalWeek;
}

/**
 * Comportement par défaut des listes réordonnables avec toggle "visible"
 * (macarons, quickaccess v2, MEA v1) : la position figée ne compte que les
 * items visibles, dans l'ordre.
 */
export function freezeItemsWithVisible<T extends Positionable, C extends { items: T[] }>(
  content: C,
  originalWeek: number,
): C {
  const items = content?.items ?? [];
  const positions = new Map<string, number>();
  let i = 0;
  for (const item of items) {
    if (item.visible) {
      i += 1;
      positions.set(item.id, i);
    }
  }
  return {
    ...content,
    items: items.map((item) =>
      isNative(item.imageWeek, originalWeek)
        ? { ...item, imageWeek: originalWeek, exportPosition: positions.get(item.id) ?? null }
        : item,
    ),
  };
}

/**
 * Même chose sans toggle "visible" (edito, img sous menu) : la position
 * compte toutes les entrées, dans l'ordre.
 */
export function freezeItemsNoVisible<
  T extends { imageWeek: number | null; exportPosition: number | null },
  C extends { items: T[] },
>(content: C, originalWeek: number): C {
  return {
    ...content,
    items: (content?.items ?? []).map((item, index) =>
      isNative(item.imageWeek, originalWeek)
        ? { ...item, imageWeek: originalWeek, exportPosition: index + 1 }
        : item,
    ),
  };
}

/** Fige la semaine sans toucher à la position (emplacements fixes). */
function freezeWeekOnly<T extends WeekOnly>(item: T, originalWeek: number): T {
  return isNative(item.imageWeek, originalWeek) ? { ...item, imageWeek: originalWeek } : item;
}

/** MEA v2 : 4 cartes + focus à emplacements fixes, donc pas de position. */
export function freezeMeaV2Content(content: MeaV2Content, originalWeek: number): MeaV2Content {
  return {
    ...content,
    cards: (content?.cards ?? []).map((card) => freezeWeekOnly(card, originalWeek)),
    focus: content?.focus ? freezeWeekOnly(content.focus, originalWeek) : content?.focus,
  };
}

/** Sections personnalisées : seuls les blocs image portent une semaine. */
export function freezeCustomContent(content: CustomContent, originalWeek: number): CustomContent {
  return {
    ...content,
    blocks: (content?.blocks ?? []).map((block) =>
      block.type === "image" ? freezeWeekOnly(block, originalWeek) : block,
    ),
  };
}

/**
 * Carousel : le fond (imageWeek) et le titre en image (titleImageWeek) sont
 * deux semaines indépendantes, chacune figée séparément si native.
 */
export function freezeCarouselContent(content: CarouselContent, originalWeek: number): CarouselContent {
  return {
    ...content,
    slides: (content?.slides ?? []).map((slide) => ({
      ...slide,
      imageWeek: isNative(slide.imageWeek, originalWeek) ? originalWeek : slide.imageWeek,
      titleImageWeek: isNative(slide.titleImageWeek, originalWeek) ? originalWeek : slide.titleImageWeek,
    })),
  };
}
