import { LOCALES, type Locale } from "@/types";

// Sérialisation / parsing des fichiers d'import-export du glossaire de traduction.
// Module pur (aucune dépendance serveur) — utilisable côté client et API.

export interface TranslationRow {
  key: string;
  values: Partial<Record<Locale, string>>;
}

const LOCALE_CODES = LOCALES.map((l) => l.value);

// U+FEFF — permet à Excel de détecter l'UTF-8
const BOM = String.fromCharCode(0xfeff);

// Export CSV : délimiteur ";" + BOM pour compatibilité Excel FR
export function translationsToCSV(rows: TranslationRow[]): string {
  const delim = ";";
  const esc = (v: string) =>
    /[";,\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
  const header = ["key", ...LOCALE_CODES].join(delim);
  const lines = rows.map((row) =>
    [esc(row.key), ...LOCALE_CODES.map((c) => esc(row.values[c] ?? ""))].join(
      delim,
    ),
  );
  return BOM + [header, ...lines].join("\r\n");
}

export function translationsToJSON(rows: TranslationRow[]): string {
  return JSON.stringify(
    rows.map((row) => ({ key: row.key, values: row.values })),
    null,
    2,
  );
}

function stripBom(text: string): string {
  return text.startsWith(BOM) ? text.slice(1) : text;
}

function detectDelimiter(headerLine: string): string {
  const semis = (headerLine.match(/;/g) ?? []).length;
  const commas = (headerLine.match(/,/g) ?? []).length;
  return semis >= commas ? ";" : ",";
}

function parseCsvGrid(text: string, delim: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === delim) {
      row.push(field);
      field = "";
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      field = "";
      rows.push(row);
      row = [];
    } else {
      field += char;
    }
  }
  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  // Ignore les lignes entièrement vides
  return rows.filter((r) => r.some((cell) => cell.trim() !== ""));
}

export function parseTranslationsCSV(text: string): TranslationRow[] {
  const clean = stripBom(text);
  const firstLine = clean.split(/\r?\n/, 1)[0] ?? "";
  const grid = parseCsvGrid(clean, detectDelimiter(firstLine));
  if (grid.length === 0) {
    throw new Error("Fichier CSV vide");
  }

  const header = grid[0].map((h) => h.trim());
  const keyIdx = header.findIndex((h) =>
    ["key", "clé", "cle"].includes(h.toLowerCase()),
  );
  if (keyIdx === -1) {
    throw new Error('Colonne "key" introuvable dans l\'en-tête du CSV');
  }

  const localeIdx = new Map<Locale, number>();
  header.forEach((h, i) => {
    const code = h.toUpperCase() as Locale;
    if (LOCALE_CODES.includes(code)) localeIdx.set(code, i);
  });
  if (localeIdx.size === 0) {
    throw new Error(
      `Aucune colonne de langue reconnue (${LOCALE_CODES.join(", ")})`,
    );
  }

  const rows: TranslationRow[] = [];
  for (const line of grid.slice(1)) {
    const key = (line[keyIdx] ?? "").trim();
    if (!key) continue;
    const values: Partial<Record<Locale, string>> = {};
    for (const [code, idx] of localeIdx) {
      const value = (line[idx] ?? "").trim();
      if (value) values[code] = value;
    }
    rows.push({ key, values });
  }
  return rows;
}

export function parseTranslationsJSON(text: string): TranslationRow[] {
  let data: unknown;
  try {
    data = JSON.parse(stripBom(text));
  } catch {
    throw new Error("Fichier JSON invalide");
  }
  if (!Array.isArray(data)) {
    throw new Error("JSON invalide : un tableau d'entrées est attendu");
  }
  return sanitizeTranslationRows(data);
}

// Valide et nettoie des lignes venant d'un import ou de l'UI :
// clé trim non vide (max 128), valeurs restreintes aux locales connues, vides ignorées.
export function sanitizeTranslationRows(input: unknown[]): TranslationRow[] {
  const rows: TranslationRow[] = [];
  for (const item of input) {
    if (!item || typeof item !== "object") continue;
    const rawKey = (item as { key?: unknown }).key;
    if (typeof rawKey !== "string") continue;
    const key = rawKey.trim();
    if (!key || key.length > 128) continue;

    const rawValues = (item as { values?: unknown }).values;
    const values: Partial<Record<Locale, string>> = {};
    if (rawValues && typeof rawValues === "object") {
      for (const code of LOCALE_CODES) {
        const value = (rawValues as Record<string, unknown>)[code];
        if (typeof value === "string" && value.trim()) {
          values[code] = value.trim();
        }
      }
    }
    rows.push({ key, values });
  }
  return rows;
}
