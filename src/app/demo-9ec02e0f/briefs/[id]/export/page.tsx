"use client";

import { use, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ImageDown, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { CopyCodeButton } from "@/components/editor/copy-code-button";
import { generateSectionHTML } from "@/templates/registry";
import { DEMO_BASE } from "../../../_demo/config";
import { DemoLoading, DemoNotFound } from "../../../_demo/states";
import {
  DEMO_SECTION_LABELS,
  briefLabel,
  useDemoBriefs,
  type DemoBrief,
  type DemoSection,
} from "../../../_demo/store";

// Pas de base : le contenu part dans la requête, et la route de la démo
// applique la même chaîne que l'export réel (collecte, sharp, ZIP en flux).
async function downloadImages(brief: DemoBrief, sections: DemoSection[]) {
  const res = await fetch(`${DEMO_BASE}/images`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      year: brief.year,
      week: brief.week,
      locale: brief.locale,
      sections: sections.map(({ type, content }) => ({ type, content })),
    }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new Error(data?.error ?? "Erreur lors du téléchargement");
  }
  const url = URL.createObjectURL(await res.blob());
  const a = document.createElement("a");
  a.href = url;
  a.download = res.headers.get("Content-Disposition")?.match(/filename="(.+)"/)?.[1] ?? "images.zip";
  a.click();
  URL.revokeObjectURL(url);
}

export default function DemoExportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const briefs = useDemoBriefs();
  // id de section ou "all" : pilote le spinner du bouton correspondant
  const [downloading, setDownloading] = useState<string | null>(null);

  if (!briefs) return <DemoLoading />;
  const brief = briefs.find((b) => b.id === id);
  if (!brief) return <DemoNotFound />;

  const ctx = { year: brief.year, week: brief.week, locale: brief.locale };

  const handleDownload = async (key: string, sections: DemoSection[]) => {
    setDownloading(key);
    try {
      await downloadImages(brief, sections);
      toast.success("Fichiers téléchargés");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur lors du téléchargement");
    } finally {
      setDownloading(null);
    }
  };

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href={`${DEMO_BASE}/briefs/${id}`}>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <h1 className="text-lg font-semibold">Export — {briefLabel(brief)}</h1>
        </div>
        <Button
          onClick={() => handleDownload("all", brief.sections)}
          disabled={downloading === "all" || brief.sections.length === 0}
        >
          {downloading === "all" ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <ImageDown className="mr-2 h-4 w-4" />
          )}
          Exporter tous les fichiers
        </Button>
      </div>

      {brief.sections.length === 0 ? (
        <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
          Ce brief n&apos;a aucune section à exporter.
        </div>
      ) : (
        <div className="space-y-6">
          {brief.sections.map((section) => {
            const html = generateSectionHTML(section.type, section.content, ctx);
            return (
              <div key={section.id} className="overflow-hidden rounded-lg border border-border/60 bg-card shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 px-5 py-3">
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-semibold">{section.title || DEMO_SECTION_LABELS[section.type]}</h2>
                    <span className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                      {DEMO_SECTION_LABELS[section.type]}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-lg"
                      onClick={() => handleDownload(section.id, [section])}
                      disabled={downloading === section.id}
                    >
                      {downloading === section.id ? (
                        <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <ImageDown className="mr-1.5 h-3.5 w-3.5" />
                      )}
                      Images
                    </Button>
                    <CopyCodeButton text={html} />
                  </div>
                </div>
                <pre className="max-h-120 overflow-auto bg-muted/40 p-5 text-xs leading-relaxed text-foreground/80">
                  <code>{html}</code>
                </pre>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
