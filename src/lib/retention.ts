import { db } from "@/lib/db";
import { assets, briefs, briefSections, settings } from "@/lib/schema";
import { and, eq, inArray, lt, notInArray } from "drizzle-orm";
import { unlink } from "fs/promises";
import { join } from "path";

// Rétention des données — v1 : dry-run + purge manuelle (pas d'automatisme).
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

// Extrait les URLs d'images (/uploads/...) référencées dans le contenu d'une section
function extractImageUrls(content: unknown): string[] {
  const items = (content as { items?: { imageUrl?: string }[] })?.items ?? [];
  return items
    .map((item) => item.imageUrl)
    .filter((url): url is string => typeof url === "string" && url.length > 0);
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
          .select({ content: briefSections.content })
          .from(briefSections)
          .where(notInArray(briefSections.briefId, expiredIds))
      : await db.select({ content: briefSections.content }).from(briefSections);

  const referencedUrls = new Set(
    remainingSections.flatMap((s) => extractImageUrls(s.content)),
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
