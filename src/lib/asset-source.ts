import type { Asset } from "@/types";
import {
  filterLocalAssets,
  getLocalImage,
  isLocalImageUrl,
  listLocalImages,
  localAssetFilterOptions,
  localImageIdFromUrl,
  renameLocalImage,
  toAsset,
  type LocalAssetFilters,
} from "@/lib/local-images";

// Accès à la médiathèque, du serveur ou de ce poste selon le mode : la
// fenêtre de médiathèque n'a pas à savoir d'où viennent les images. En mode
// local, aucune requête ne part vers le serveur.

export interface AssetFilterOptions {
  years: number[];
  weeks: number[];
  types: string[];
}

export async function searchAssets(filters: LocalAssetFilters, local: boolean): Promise<Asset[] | null> {
  if (local) return filterLocalAssets(await listLocalImages(), filters);
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) if (value) params.set(key, value);
  const res = await fetch(`/api/assets?${params}`);
  return res.ok ? res.json() : null;
}

export async function assetFilterOptions(local: boolean): Promise<AssetFilterOptions | null> {
  if (local) return localAssetFilterOptions(await listLocalImages());
  const res = await fetch("/api/assets/filters");
  return res.ok ? res.json() : null;
}

/** Image déjà en place dans un emplacement : cherchée là où elle vit, d'après son adresse. */
export async function findAssetByUrl(url: string): Promise<Asset | undefined> {
  if (isLocalImageUrl(url)) {
    const record = await getLocalImage(localImageIdFromUrl(url));
    return record && toAsset(record);
  }
  const res = await fetch(`/api/assets?url=${encodeURIComponent(url)}`);
  if (!res.ok) return undefined;
  const rows: Asset[] = await res.json();
  return rows[0];
}

export async function renameAsset(asset: Asset, label: string): Promise<string | null> {
  if (isLocalImageUrl(asset.url)) return (await renameLocalImage(asset.id, label))?.label ?? null;
  const res = await fetch("/api/assets", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id: asset.id, label }),
  });
  return res.ok ? (await res.json()).label : null;
}
