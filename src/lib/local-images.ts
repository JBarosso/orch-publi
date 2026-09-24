import type { Asset, AssetType } from "@/types";

// Images du mode local : rangées dans ce navigateur (IndexedDB), jamais
// envoyées au serveur. Le contenu des briefs les désigne par une adresse
// ordinaire, /local-images/<id>.<ext>, que le service worker
// (public/local-images-sw.js) sert depuis cette même base — toute balise
// <img> existante les affiche donc sans modification. Chez quelqu'un qui n'a
// pas l'image, la route src/app/local-images renvoie une image de remplacement.

export const LOCAL_IMAGE_PREFIX = "/local-images/";
// Doivent rester identiques à ceux de public/local-images-sw.js.
export const LOCAL_DB_NAME = "orch-publi-local";
export const LOCAL_DB_STORE = "images";
/** En-tête posé par la route de remplacement : l'image n'est pas sur ce poste. */
export const LOCAL_IMAGE_MISSING_HEADER = "x-local-image-missing";

export function isLocalImageUrl(url: unknown): url is string {
  return typeof url === "string" && url.startsWith(LOCAL_IMAGE_PREFIX);
}

export function localImageUrl(id: string, ext: string): string {
  return `${LOCAL_IMAGE_PREFIX}${id}.${ext}`;
}

export function localImageIdFromUrl(url: string): string {
  return url.slice(LOCAL_IMAGE_PREFIX.length).replace(/\.[^./]+$/, "");
}

/** Le contenu d'une section désigne-t-il au moins une image locale ? */
export function contentHasLocalImages(content: unknown): boolean {
  return JSON.stringify(content ?? null).includes(LOCAL_IMAGE_PREFIX);
}

export interface LocalImageRecord {
  id: string;
  url: string;
  blob: Blob;
  mimeType: string;
  label: string;
  type: AssetType;
  week: number | null;
  year: number | null;
  originUrl: string | null;
  createdAt: number;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(LOCAL_DB_NAME, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(LOCAL_DB_STORE)) {
        request.result.createObjectStore(LOCAL_DB_STORE, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function withStore<T>(
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const db = await openDb();
  try {
    return await new Promise<T>((resolve, reject) => {
      const request = run(db.transaction(LOCAL_DB_STORE, mode).objectStore(LOCAL_DB_STORE));
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  } finally {
    db.close();
  }
}

export async function saveLocalImage(record: LocalImageRecord): Promise<void> {
  // Sans ça, le navigateur peut effacer la base de lui-même quand le disque
  // se remplit — la perte serait silencieuse. Accordé sans question sur un
  // site déjà utilisé ; un refus n'empêche pas l'enregistrement.
  await navigator.storage?.persist?.().catch(() => false);
  await withStore("readwrite", (store) => store.put(record));
}

export function getLocalImage(id: string): Promise<LocalImageRecord | undefined> {
  return withStore("readonly", (store) => store.get(id));
}

export function listLocalImages(): Promise<LocalImageRecord[]> {
  return withStore("readonly", (store) => store.getAll());
}

export async function renameLocalImage(id: string, label: string): Promise<LocalImageRecord | undefined> {
  const record = await getLocalImage(id);
  if (!record) return undefined;
  const updated = { ...record, label };
  await withStore("readwrite", (store) => store.put(updated));
  return updated;
}

export function toAsset(record: LocalImageRecord): Asset {
  return {
    id: record.id,
    url: record.url,
    type: record.type,
    label: record.label,
    mimeType: record.mimeType,
    year: record.year,
    week: record.week,
    originUrl: record.originUrl,
    createdAt: new Date(record.createdAt),
  };
}

export interface LocalAssetFilters {
  search?: string;
  week?: string;
  year?: string;
  type?: string;
}

/** Mêmes filtres que GET /api/assets, appliqués aux images du poste. */
export function filterLocalAssets(records: LocalImageRecord[], filters: LocalAssetFilters): Asset[] {
  const search = filters.search?.trim().toLowerCase();
  return records
    .filter((r) => !search || r.label.toLowerCase().includes(search))
    .filter((r) => !filters.week || r.week === Number(filters.week))
    .filter((r) => !filters.year || r.year === Number(filters.year))
    .filter((r) => !filters.type || r.type === filters.type)
    .sort((a, b) => b.createdAt - a.createdAt)
    .map(toAsset);
}

/** Valeurs proposées dans les filtres de la médiathèque (cf. /api/assets/filters). */
export function localAssetFilterOptions(records: LocalImageRecord[]) {
  const uniq = <T,>(values: (T | null)[]) => [...new Set(values.filter((v): v is T => v !== null))];
  return {
    years: uniq(records.map((r) => r.year)).sort((a, b) => b - a),
    weeks: uniq(records.map((r) => r.week)).sort((a, b) => a - b),
    types: uniq(records.map((r) => r.type)),
  };
}
