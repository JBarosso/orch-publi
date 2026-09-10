import { db } from "@/lib/db";
import { assets, briefs, briefSections, customTemplates, settings } from "@/lib/schema";
import { and, eq, inArray, lt, notInArray } from "drizzle-orm";
import { deleteAsset, purgeStaleTempUploads } from "@/lib/storage";

// Rétention des données : aperçu (dry-run) et purge manuelle depuis
// Paramétrage, plus un passage automatique quotidien (cf. runScheduledPurge).
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

// Toute URL d'asset présente n'importe où dans le contenu compte comme une
// référence : champ dédié, mais aussi HTML ou texte libre. Volontairement
// générique — la liste de champs par template qui existait ici ignorait le
// carousel et le cat banner, dont les images étaient alors purgées alors
// qu'encore utilisées.
const ASSET_URL_PATTERN = /https?:\/\/[^\s"'<>()\\]+|\/uploads\/[^\s"'<>()\\]+/g;

export function extractReferencedAssetUrls(value: unknown): string[] {
  return JSON.stringify(value ?? null).match(ASSET_URL_PATTERN) ?? [];
}

// URLs encore utilisées : sections des briefs conservés, et templates
// personnalisés (qui embarquent leurs propres images).
async function collectReferencedAssetUrls(excludedBriefIds: string[]): Promise<Set<string>> {
  const [sections, templates] = await Promise.all([
    db
      .select({ content: briefSections.content })
      .from(briefSections)
      .where(
        excludedBriefIds.length > 0 ? notInArray(briefSections.briefId, excludedBriefIds) : undefined,
      ),
    db.select({ blocks: customTemplates.blocks }).from(customTemplates),
  ]);
  return new Set([
    ...sections.flatMap((s) => extractReferencedAssetUrls(s.content)),
    ...templates.flatMap((t) => extractReferencedAssetUrls(t.blocks)),
  ]);
}

export async function computePurgePreview(
  months: number,
): Promise<PurgePreview> {
  const cutoff = retentionCutoff(months);

  const expiredBriefs = await db
    .select({ id: briefs.id, slug: briefs.slug, createdAt: briefs.createdAt })
    .from(briefs)
    .where(and(eq(briefs.status, "treated"), lt(briefs.createdAt, cutoff)));

  const referencedUrls = await collectReferencedAssetUrls(expiredBriefs.map((b) => b.id));

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
    await deleteAsset(asset.url);
    await db.delete(assets).where(eq(assets.id, asset.id));
  }

  return {
    deletedBriefs: preview.briefs.length,
    deletedAssets: preview.assets.length,
  };
}

// --- Rétention vidéo MEA v2 — automatique ---
// Les vidéos sont lourdes : purgées une fois expirées, SAUF si encore
// référencées par une section de brief existante (même invariant que ci-dessus).
// Contrairement à la purge briefs/images, celle-ci ne dépend d'aucun statut de
// brief ni d'aucun réglage : elle passe à chaque exécution automatique.

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

  const referencedUrls = await collectReferencedAssetUrls([]);

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
    await deleteAsset(video.url);
    await db.delete(assets).where(eq(assets.id, video.id));
  }

  return { deletedVideos: preview.videos.length };
}

// --- Passage automatique quotidien (cron Vercel, cf. /api/cron/retention) ---

const AUTO_PURGE_SETTING_KEY = "autoPurge";
const LAST_SCHEDULED_PURGE_KEY = "lastScheduledPurge";

async function readSetting<T>(key: string): Promise<T | undefined> {
  const [row] = await db.select().from(settings).where(eq(settings.key, key));
  return row?.value as T | undefined;
}

async function writeSetting(key: string, value: unknown): Promise<void> {
  await db
    .insert(settings)
    .values({ key, value })
    .onConflictDoUpdate({ target: settings.key, set: { value, updatedAt: new Date() } });
}

/** Désactivée par défaut : la purge des briefs est irréversible. */
export async function getAutoPurgeEnabled(): Promise<boolean> {
  return (await readSetting<{ enabled?: boolean }>(AUTO_PURGE_SETTING_KEY))?.enabled === true;
}

export async function setAutoPurgeEnabled(enabled: boolean): Promise<void> {
  await writeSetting(AUTO_PURGE_SETTING_KEY, { enabled });
}

export interface ScheduledPurgeReport {
  ranAt: string;
  briefPurgeEnabled: boolean;
  deletedBriefs: number;
  deletedAssets: number;
  deletedVideos: number;
  /** Fichiers de transit de l'upload direct (tmp/) plus vieux que 24 h. */
  deletedTempUploads: number;
  error?: string;
}

export async function getLastScheduledPurge(): Promise<ScheduledPurgeReport | null> {
  return (await readSetting<ScheduledPurgeReport>(LAST_SCHEDULED_PURGE_KEY)) ?? null;
}

/**
 * Briefs et images seulement si la purge automatique est activée ; vidéos et
 * fichiers de transit toujours. Le compte rendu est conservé pour Paramétrage :
 * une purge qui tourne seule doit laisser une trace, y compris quand elle échoue.
 */
export async function runScheduledPurge(): Promise<ScheduledPurgeReport> {
  const report: ScheduledPurgeReport = {
    ranAt: new Date().toISOString(),
    briefPurgeEnabled: false,
    deletedBriefs: 0,
    deletedAssets: 0,
    deletedVideos: 0,
    deletedTempUploads: 0,
  };

  try {
    report.briefPurgeEnabled = await getAutoPurgeEnabled();
    // Briefs d'abord : les vidéos qu'ils étaient seuls à utiliser deviennent
    // purgeables dès ce passage.
    if (report.briefPurgeEnabled) {
      const result = await executePurge(await getRetentionMonths());
      report.deletedBriefs = result.deletedBriefs;
      report.deletedAssets = result.deletedAssets;
    }
    report.deletedVideos = (await executeVideoPurge(await getVideoRetentionDays())).deletedVideos;
    report.deletedTempUploads = await purgeStaleTempUploads();
  } catch (err) {
    report.error = err instanceof Error ? err.message : String(err);
  }

  await writeSetting(LAST_SCHEDULED_PURGE_KEY, report);
  return report;
}
