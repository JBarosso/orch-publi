import type { CarouselContent, CustomContent, EditoContent, MacaronsContent, MeaContent, MeaV2Content } from "@/types";

// À la duplication d'un brief vers une AUTRE semaine, un item dont l'image
// était "native" de la semaine source (imageWeek non renseigné, ou égal à la
// semaine source) doit être figé : il continue de pointer vers la semaine et
// la position où le fichier existe réellement, plutôt que de glisser
// silencieusement vers la nouvelle semaine du brief dupliqué (ce qui casse
// le lien vers un fichier jamais réuploadé). Un item déjà figé sur une
// semaine antérieure (imageWeek différent de la semaine source) est laissé
// tel quel — on ne fige qu'une fois, à l'origine réelle de la référence.

interface Positionable {
  id: string;
  visible: boolean;
  imageWeek: number | null;
  exportPosition: number | null;
}

function freezePositionableList<T extends Positionable>(
  items: T[],
  originalWeek: number,
): T[] {
  const positions = new Map<string, number>();
  let i = 0;
  for (const item of items) {
    if (item.visible) {
      i += 1;
      positions.set(item.id, i);
    }
  }
  return items.map((item) => {
    const isNative = item.imageWeek == null || item.imageWeek === originalWeek;
    if (!isNative) return item;
    return {
      ...item,
      imageWeek: originalWeek,
      exportPosition: positions.get(item.id) ?? null,
    };
  });
}

// Edito n'a pas de toggle "visible" par carte : la position compte toutes
// les cartes, dans l'ordre.
function freezePositionableListNoVisibleFilter<
  T extends { id: string; imageWeek: number | null; exportPosition: number | null },
>(items: T[], originalWeek: number): T[] {
  return items.map((item, index) => {
    const isNative = item.imageWeek == null || item.imageWeek === originalWeek;
    if (!isNative) return item;
    return { ...item, imageWeek: originalWeek, exportPosition: index + 1 };
  });
}

function freezeWeekOnly<T extends { imageWeek: number | null }>(
  item: T,
  originalWeek: number,
): T {
  const isNative = item.imageWeek == null || item.imageWeek === originalWeek;
  return isNative ? { ...item, imageWeek: originalWeek } : item;
}

export function freezeSectionContentWeek(
  type: string,
  content: unknown,
  originalWeek: number,
): unknown {
  if (type === "macarons" || type === "macarons_v2") {
    const c = content as MacaronsContent;
    return { ...c, items: freezePositionableList(c?.items ?? [], originalWeek) };
  }
  if (type === "mea") {
    const c = content as MeaContent;
    return { ...c, items: freezePositionableList(c?.items ?? [], originalWeek) };
  }
  if (type === "mea_v2") {
    const c = content as MeaV2Content;
    return {
      ...c,
      cards: (c?.cards ?? []).map((card) => freezeWeekOnly(card, originalWeek)),
      focus: c?.focus ? freezeWeekOnly(c.focus, originalWeek) : c?.focus,
    };
  }
  if (type === "custom") {
    const c = content as CustomContent;
    return {
      ...c,
      blocks: (c?.blocks ?? []).map((block) =>
        block.type === "image" ? freezeWeekOnly(block, originalWeek) : block,
      ),
    };
  }
  if (type === "edito") {
    const c = content as EditoContent;
    return { ...c, items: freezePositionableListNoVisibleFilter(c?.items ?? [], originalWeek) };
  }
  if (type === "carousel") {
    const c = content as CarouselContent;
    return {
      ...c,
      slides: (c?.slides ?? []).map((slide) => {
        // Fond (imageWeek) et titre image (titleImageWeek) sont deux semaines
        // indépendantes — chacune figée séparément si native de la semaine source.
        const frozenMedia = freezeWeekOnly({ imageWeek: slide.imageWeek }, originalWeek);
        const frozenTitle =
          slide.titleImageWeek == null || slide.titleImageWeek === originalWeek
            ? originalWeek
            : slide.titleImageWeek;
        return { ...slide, imageWeek: frozenMedia.imageWeek, titleImageWeek: frozenTitle };
      }),
    };
  }
  return content;
}
