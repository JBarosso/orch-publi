import { db } from "@/lib/db";
import { assets, briefs, briefSections, settings } from "@/lib/schema";
import { and, eq, inArray, lt, notInArray } from "drizzle-orm";
import { unlink } from "fs/promises";
import { join } from "path";
import type { CustomContent, MeaV2Content } from "@/types";

// Rétention des données — v1 : dry-run + purge manuelle pour les briefs
// (pas d'automatisme). La purge vidéo MEA v2 (plus bas) est automatique.
// Éligibles : briefs « traités » créés avant la date limite (+ sections en cascade),
// puis assets créés avant la date limite ET non référencés par les briefs restants.

export const RETENTION_SETTING_KEY = "retention";
export const DEFAULT_RETENTION_MONTHS = 24;
export const MIN_RETENTION_MONTHS = 1;
export const MAX_RETENTION_MONTHS = 120;

export async function getRetentionMonths(): Promise<number> {
  const [row] = await db
    .select()
    .from(settings)
    .where(eq(settings.key, RETENTION_SETTING_KEY));
  const months = (row?.value as { months?: number } | undefined)?.months;
  return typeof months === "number" && months >= MIN_RETENTION_MONTHS
    ? months
    : DEFAULT_RETENTION_MONTHS;
}

export async function setRetentionMonths(months: number): Promise<void> {
  await db
    .insert(settings)
    .values({ key: RETENTION_SETTING_KEY, value: { months } })
    .onConflictDoUpdate({
      target: settings.key,
      set: { value: { months }, updatedAt: new Date() },
    });
}

export function retentionCutoff(months: number): Date {
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - months);
  return cutoff;
}

export interface PurgePreview {
  cutoff: string;
  months: number;
  briefs: { id: string; slug: string; createdAt: Date }[];
  assets: { id: string; url: string; label: string; createdAt: Date }[];
}

// Extrait les URLs (/uploads/...) référencées dans le contenu d'une section —
// images et vidéos, tous types de section confondus (items, blocks, cards+focus).
function extractReferencedAssetUrls(type: string, content: unknown): string[] {
  const urls: (string | undefined)[] = [];

  if (type === "custom") {
    const blocks = (content as CustomContent)?.blocks ?? [];
    urls.push(...blocks.map((b) => b.imageUrl));
  } else if (type === "mea_v2") {
    const c = content as MeaV2Content;
    urls.push(...(c?.cards ?? []).map((card) => card.imageUrl));
    urls.push(c?.focus?.imageUrl, c?.focus?.videoUrl);
  } else {
    // macarons, macarons_v2, mea : forme {items: [{imageUrl}]}
    const items = (content as { items?: { imageUrl?: string }[] })?.items ?? [];
    urls.push(...items.map((item) => item.imageUrl));
  }

  return urls.filter((url): url is string => typeof url === "string" && url.length > 0);
}

export async function computePurgePreview(
  months: number,
): Promise<PurgePreview> {
  const cutoff = retentionCutoff(months);

  const expiredBriefs = await db
    .select({ id: briefs.id, slug: briefs.slug, createdAt: briefs.createdAt })
    .from(briefs)
    .where(and(eq(briefs.status, "treated"), lt(briefs.createdAt, cutoff)));

  const expiredIds = expiredBriefs.map((b) => b.id);

  // URLs encore référencées par les sections des briefs qui resteront
  const remainingSections =
    expiredIds.length > 0
      ? await db
          .select({ type: briefSections.type, content: briefSections.content })
          .from(briefSections)
          .where(notInArray(briefSections.briefId, expiredIds))
      : await db
          .select({ type: briefSections.type, content: briefSections.content })
          .from(briefSections);

  const referencedUrls = new Set(
    remainingSections.flatMap((s) => extractReferencedAssetUrls(s.type, s.content)),
  );

  const oldAssets = await db
    .select({
      id: assets.id,
      url: assets.url,
      label: assets.label,
      createdAt: assets.createdAt,
    })
    .from(assets)
    .where(lt(assets.createdAt, cutoff));

  const orphanAssets = oldAssets.filter((a) => !referencedUrls.has(a.url));

  return {
    cutoff: cutoff.toISOString(),
    months,
    briefs: expiredBriefs,
    assets: orphanAssets,
  };
}

export interface PurgeResult {
  deletedBriefs: number;
  deletedAssets: number;
}

export async function executePurge(months: number): Promise<PurgeResult> {
  const preview = await computePurgePreview(months);

  if (preview.briefs.length > 0) {
    await db.delete(briefs).where(
      inArray(
        briefs.id,
        preview.briefs.map((b) => b.id),
      ),
    );
  }

  for (const asset of preview.assets) {
    try {
      await unlink(join(process.cwd(), "public", asset.url));
    } catch {
      // fichier déjà absent : on supprime quand même la ligne
    }
    await db.delete(assets).where(eq(assets.id, asset.id));
  }

  return {
    deletedBriefs: preview.briefs.length,
    deletedAssets: preview.assets.length,
  };
}

// --- Rétention vidéo MEA v2 — automatique (voir src/instrumentation.ts) ---
// Les vidéos sont lourdes : purgées une fois expirées, SAUF si encore
// référencées par une section de brief existante (même invariant que ci-dessus).
// Contrairement à la purge briefs/images, celle-ci ne dépend d'aucun statut de
// brief ni d'aucun clic — elle tourne seule en tâche de fond.

export const VIDEO_RETENTION_SETTING_KEY = "videoRetention";
export const DEFAULT_VIDEO_RETENTION_DAYS = 30;
export const MIN_VIDEO_RETENTION_DAYS = 1;
export const MAX_VIDEO_RETENTION_DAYS = 365;

export async function getVideoRetentionDays(): Promise<number> {
  const [row] = await db
    .select()
    .from(settings)
    .where(eq(settings.key, VIDEO_RETENTION_SETTING_KEY));
  const days = (row?.value as { days?: number } | undefined)?.days;
  return typeof days === "number" && days >= MIN_VIDEO_RETENTION_DAYS
    ? days
    : DEFAULT_VIDEO_RETENTION_DAYS;
}

export async function setVideoRetentionDays(days: number): Promise<void> {
  await db
    .insert(settings)
    .values({ key: VIDEO_RETENTION_SETTING_KEY, value: { days } })
    .onConflictDoUpdate({
      target: settings.key,
      set: { value: { days }, updatedAt: new Date() },
    });
}

export function videoRetentionCutoff(days: number): Date {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  return cutoff;
}

export interface VideoPurgePreview {
  cutoff: string;
  days: number;
  videos: { id: string; url: string; label: string; createdAt: Date }[];
}

export async function computeVideoPurgePreview(
  days: number,
): Promise<VideoPurgePreview> {
  const cutoff = videoRetentionCutoff(days);

  const allSections = await db
    .select({ type: briefSections.type, content: briefSections.content })
    .from(briefSections);
  const referencedUrls = new Set(
    allSections.flatMap((s) => extractReferencedAssetUrls(s.type, s.content)),
  );

  const oldVideos = await db
    .select({
      id: assets.id,
      url: assets.url,
      label: assets.label,
      createdAt: assets.createdAt,
    })
    .from(assets)
    .where(and(eq(assets.type, "mea_v2_video"), lt(assets.createdAt, cutoff)));

  const expiredVideos = oldVideos.filter((v) => !referencedUrls.has(v.url));

  return {
    cutoff: cutoff.toISOString(),
    days,
    videos: expiredVideos,
  };
}

export interface VideoPurgeResult {
  deletedVideos: number;
}

export async function executeVideoPurge(days: number): Promise<VideoPurgeResult> {
  const preview = await computeVideoPurgePreview(days);

  for (const video of preview.videos) {
    try {
      await unlink(join(process.cwd(), "public", video.url));
    } catch {
      // fichier déjà absent : on supprime quand même la ligne
    }
    await db.delete(assets).where(eq(assets.id, video.id));
  }

  return { deletedVideos: preview.videos.length };
}
