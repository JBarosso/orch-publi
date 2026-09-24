import { NextRequest, NextResponse } from "next/server";
import { inArray, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { assets, briefSections, customTemplates } from "@/lib/schema";
import { isWellFormedLocalImageUrl } from "@/lib/local-images";

// Fin du mode local : les images du poste viennent d'être envoyées à la
// médiathèque (POST /api/assets). On remplace leur adresse /local-images/...
// par celle du serveur partout où elles sont utilisées. Le remplacement se
// fait dans la base, ligne par ligne et d'un seul coup : aucune modification
// enregistrée entre-temps ne peut être écrasée.
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const urls: unknown = body?.urls;
  if (!urls || typeof urls !== "object") {
    return NextResponse.json({ error: "urls requis" }, { status: 400 });
  }
  const entries = Object.entries(urls as Record<string, unknown>);
  if (entries.length === 0 || entries.some(([from, to]) => !isWellFormedLocalImageUrl(from) || typeof to !== "string")) {
    return NextResponse.json({ error: "Adresses invalides" }, { status: 400 });
  }
  // On n'écrit dans le contenu que des adresses de la médiathèque, jamais un
  // texte quelconque venu du navigateur.
  const targets = [...new Set(entries.map(([, to]) => to as string))];
  const known = await db.select({ url: assets.url }).from(assets).where(inArray(assets.url, targets));
  if (known.length !== targets.length) {
    return NextResponse.json({ error: "Image inconnue de la médiathèque" }, { status: 400 });
  }

  const updatedAt: Record<string, string> = {};
  for (const [from, to] of entries as [string, string][]) {
    const rows = await db
      .update(briefSections)
      .set({ content: sql`replace(${briefSections.content}::text, ${from}, ${to})::jsonb` })
      .where(sql`position(${from} in ${briefSections.content}::text) > 0`)
      .returning({ id: briefSections.id, updatedAt: briefSections.updatedAt });
    for (const row of rows) updatedAt[row.id] = row.updatedAt.toISOString();
    await db
      .update(customTemplates)
      .set({ blocks: sql`replace(${customTemplates.blocks}::text, ${from}, ${to})::jsonb` })
      .where(sql`position(${from} in ${customTemplates.blocks}::text) > 0`);
  }

  return NextResponse.json({ updatedAt });
}
