import type {
  Locale,
  MacaronsContent,
  MeaContent,
  MeaItem,
} from "@/types";

// Traduction du contenu des sections lors d'une duplication inter-langues.
// Substitution par correspondance exacte (normalisée) sur le glossaire :
// valeur langue source -> valeur langue cible.
// Les textes introuvables ou ambigus restent en langue source et sont
// signalés via le commentaire dev de l'item (bordure rouge dans l'éditeur).

export interface GlossaryEntry {
  key: string;
  values: Partial<Record<Locale, string>>;
}

export interface TranslateStats {
  translated: number;
  missing: number;
  ambiguous: number;
}

const AMBIGUOUS = Symbol("ambiguous");

// Zero-width spaces & co (U+200B–U+200D, U+FEFF) : présents dans les textes
// copiés depuis le CMS, invisibles à l'écran mais cassent les comparaisons
const INVISIBLE_CHARS = new RegExp(
  `[${String.fromCharCode(0x200b)}-${String.fromCharCode(0x200d)}${String.fromCharCode(0xfeff)}]`,
  "g",
);

function norm(s: string): string {
  return s
    .normalize("NFC")
    .replace(INVISIBLE_CHARS, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

// Si le texte source était entièrement en minuscules (usage macarons),
// la traduction adopte le même style ; sinon on garde la casse du glossaire
function matchCaseStyle(source: string, translated: string): string {
  return source === source.toLowerCase() ? translated.toLowerCase() : translated;
}

// Map texte source normalisé -> traduction cible (ou AMBIGUOUS si plusieurs
// entrées du glossaire donnent des traductions différentes pour le même texte)
export function buildTranslationLookup(
  entries: GlossaryEntry[],
  source: Locale,
  target: Locale,
): Map<string, string | typeof AMBIGUOUS> {
  const map = new Map<string, string | typeof AMBIGUOUS>();
  for (const entry of entries) {
    const src = entry.values[source];
    const tgt = entry.values[target];
    if (!src || !tgt) continue;
    const key = norm(src);
    const existing = map.get(key);
    if (existing === undefined) {
      map.set(key, tgt);
    } else if (existing !== AMBIGUOUS && norm(existing) !== norm(tgt)) {
      map.set(key, AMBIGUOUS);
    }
  }
  return map;
}

type Lookup = ReturnType<typeof buildTranslationLookup>;

interface FieldResult {
  value: string;
  status: "translated" | "missing" | "ambiguous" | "skipped";
}

function translateField(value: string, lookup: Lookup): FieldResult {
  if (!value.trim()) return { value, status: "skipped" };
  const found = lookup.get(norm(value));
  if (found === undefined) return { value, status: "missing" };
  if (found === AMBIGUOUS) return { value, status: "ambiguous" };
  return { value: matchCaseStyle(value, found), status: "translated" };
}

const NOTE_PREFIX = "[Traduction]";

function appendNote(comment: string, notes: string[]): string {
  if (notes.length === 0) return comment;
  const note = `${NOTE_PREFIX} À vérifier : ${notes.join(", ")}`;
  return comment ? `${comment}\n${note}` : note;
}

// Traduit un champ, comptabilise le résultat et alimente les notes de l'item
function applyField(
  value: string,
  fieldLabel: string,
  lookup: Lookup,
  stats: TranslateStats,
  notes: string[],
): string {
  const result = translateField(value, lookup);
  if (result.status === "translated") stats.translated++;
  if (result.status === "missing") {
    stats.missing++;
    notes.push(`${fieldLabel} (non trouvé dans le glossaire)`);
  }
  if (result.status === "ambiguous") {
    stats.ambiguous++;
    notes.push(`${fieldLabel} (plusieurs traductions possibles)`);
  }
  return result.value;
}

function translateMacaronsContent(
  content: MacaronsContent,
  lookup: Lookup,
  stats: TranslateStats,
): MacaronsContent {
  return {
    ...content,
    items: (content.items ?? []).map((item) => {
      const notes: string[] = [];
      const wasTranslated =
        translateField(item.label, lookup).status === "translated";
      const label = applyField(item.label, "label", lookup, stats, notes);
      // Contrainte macarons : 16 caractères max
      if (wasTranslated && label.length > 16) {
        notes.push(`label traduit trop long (${label.length}/16 caractères)`);
      }
      return { ...item, label, comment: appendNote(item.comment, notes) };
    }),
  };
}

function translateMeaContent(
  content: MeaContent,
  lookup: Lookup,
  stats: TranslateStats,
): MeaContent {
  return {
    ...content,
    items: (content.items ?? []).map((item) => {
      const notes: string[] = [];
      const translated: MeaItem = {
        ...item,
        title: applyField(item.title, "titre", lookup, stats, notes),
        overlayText: applyField(item.overlayText, "texte overlay", lookup, stats, notes),
        prePriceText: applyField(item.prePriceText, "texte avant-prix", lookup, stats, notes),
        customPriceText: applyField(item.customPriceText, "texte prix custom", lookup, stats, notes),
        clubLabelText: applyField(item.clubLabelText, "label club", lookup, stats, notes),
        buttons: (item.buttons ?? []).map((button, i) => ({
          ...button,
          text: applyField(
            button.text,
            item.buttons.length > 1 ? `bouton ${i + 1}` : "bouton",
            lookup,
            stats,
            notes,
          ),
        })),
      };
      return { ...translated, comment: appendNote(item.comment, notes) };
    }),
  };
}

export function translateSectionContent(
  type: string,
  content: unknown,
  lookup: Lookup,
  stats: TranslateStats,
): unknown {
  if (type === "macarons") {
    return translateMacaronsContent(content as MacaronsContent, lookup, stats);
  }
  if (type === "mea") {
    return translateMeaContent(content as MeaContent, lookup, stats);
  }
  return content;
}
