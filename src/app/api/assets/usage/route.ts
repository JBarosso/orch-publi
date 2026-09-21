import { NextRequest, NextResponse } from "next/server";
import { eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { assets, briefSections, briefs, customTemplates, editoItems } from "@/lib/schema";
import type { AssetUsage } from "@/lib/asset-usage";

// Endroits qui utilisent encore une image, consultés avant sa suppression
// depuis la médiathèque. Même critère que la purge automatique (l'URL
// présente n'importe où dans le contenu, cf. extractReferencedAssetUrls),
// mais évalué côté base : pas besoin de charger tout le contenu des briefs.

export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id requis" }, { status: 400 });

  const [asset] = await db.select({ url: assets.url }).from(assets).where(eq(assets.id, id));
  if (!asset) return NextResponse.json({ error: "Asset introuvable" }, { status: 404 });

  const { url } = asset;
  const [sectionRows, [templateCount], [editoCount]] = await Promise.all([
    db
      .select({
        briefId: briefs.id,
        name: briefs.name,
        slug: briefs.slug,
        sectionTitle: briefSections.title,
        sectionType: briefSections.type,
      })
      .from(briefSections)
      .innerJoin(briefs, eq(briefs.id, briefSections.briefId))
      .where(sql`position(${url} in ${briefSections.content}::text) > 0`),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(customTemplates)
      .where(sql`position(${url} in ${customTemplates.blocks}::text) > 0`),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(editoItems)
      .where(eq(editoItems.imageUrl, url)),
  ]);

  const byBrief = new Map<string, AssetUsage["briefs"][number]>();
  for (const row of sectionRows) {
    const entry = byBrief.get(row.briefId) ?? {
      id: row.briefId,
      label: row.name || row.slug,
      sections: [],
    };
    entry.sections.push(row.sectionTitle || row.sectionType);
    byBrief.set(row.briefId, entry);
  }

  const usage: AssetUsage = {
    briefs: [...byBrief.values()],
    templates: templateCount?.count ?? 0,
    editoBlocks: editoCount?.count ?? 0,
  };
  return NextResponse.json(usage);
}
