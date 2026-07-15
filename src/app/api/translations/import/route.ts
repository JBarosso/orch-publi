import { NextRequest, NextResponse } from "next/server";
import {
  parseTranslationsCSV,
  parseTranslationsJSON,
} from "@/lib/translation-csv";
import { upsertTranslationRows } from "@/lib/translations";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { content, format } = body;

  if (typeof content !== "string" || !content.trim()) {
    return NextResponse.json({ error: "Fichier vide" }, { status: 400 });
  }
  if (format !== "csv" && format !== "json") {
    return NextResponse.json(
      { error: 'Format attendu : "csv" ou "json"' },
      { status: 400 },
    );
  }

  try {
    const rows =
      format === "csv"
        ? parseTranslationsCSV(content)
        : parseTranslationsJSON(content);

    if (rows.length === 0) {
      return NextResponse.json(
        { error: "Aucune entrée valide trouvée dans le fichier" },
        { status: 400 },
      );
    }

    // merge : les langues absentes du fichier ne sont pas effacées
    const count = await upsertTranslationRows(rows, "merge");
    return NextResponse.json({ imported: count });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Fichier illisible";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
