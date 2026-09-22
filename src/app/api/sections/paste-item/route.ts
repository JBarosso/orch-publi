import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { adaptSectionContentForBrief } from "@/templates/registry";
import { ITEM_SECTIONS, isItemSectionType } from "@/lib/section-items";
import { translatePastedContent } from "@/lib/translations";
import type { TranslateStats } from "@/lib/translate-content";

interface BriefRef {
  week: number;
  locale: string;
}

const isBriefRef = (v: unknown): v is BriefRef =>
  !!v && Number.isInteger((v as BriefRef).week) && typeof (v as BriefRef).locale === "string";

// Prépare un item copié pour une autre section (cf. src/components/editor/item-clipboard.tsx).
// Rien n'est enregistré ici : l'item revient au navigateur, ajouté à la section
// en cours d'édition, et part avec le prochain enregistrement du brief.
export async function POST(request: NextRequest) {
  const { type, sourceType, sourceContent, itemId, from, to, translate } = await request.json();

  if (
    !isItemSectionType(type) ||
    !isItemSectionType(sourceType) ||
    ITEM_SECTIONS[type].kind !== ITEM_SECTIONS[sourceType].kind ||
    !isBriefRef(from) ||
    !isBriefRef(to)
  ) {
    return NextResponse.json({ error: "Item copié incompatible avec cette section" }, { status: 400 });
  }

  // Figé au sein de sa section d'origine, où sa position est connue : seul, il
  // serait toujours « position 1 » et pointerait vers le mauvais fichier.
  const key = ITEM_SECTIONS[sourceType].key;
  const adapted = adaptSectionContentForBrief(sourceType, sourceContent, from, to) as Record<string, unknown>;
  const list = Array.isArray(adapted?.[key]) ? (adapted[key] as { id?: unknown }[]) : [];
  let item: unknown = list.find((i) => i?.id === itemId);
  if (!item) {
    return NextResponse.json({ error: "Item copié introuvable" }, { status: 400 });
  }

  let translation: TranslateStats | null = null;
  if (translate === true && from.locale.toUpperCase() !== to.locale.toUpperCase()) {
    // Seul l'item est traduit (les autres champs de la section suivent sans servir).
    const translated = await translatePastedContent(sourceType, { ...adapted, [key]: [item] }, from.locale, to.locale);
    item = (translated.content as Record<string, unknown[]>)[key][0];
    translation = translated.stats;
  }

  return NextResponse.json({ item: { ...(item as object), id: randomUUID() }, translation });
}
