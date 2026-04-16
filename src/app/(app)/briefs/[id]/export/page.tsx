"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Copy, Check, Loader2, ImageDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import type { Brief, BriefSection, BriefStatus } from "@/types";
import { StatusBadge } from "@/components/briefs/status-badge";

interface BriefWithSections extends Brief {
  sections: BriefSection[];
}

export default function ExportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [brief, setBrief] = useState<BriefWithSections | null>(null);
  const [loading, setLoading] = useState(true);
  const [exports, setExports] = useState<
    { type: string; html: string; sectionId: string }[]
  >([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [downloadingImages, setDownloadingImages] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const res = await fetch(`/api/briefs/${id}`);
      if (!res.ok) {
        router.push("/");
        return;
      }
      const data: BriefWithSections = await res.json();
      setBrief(data);

      const results = await Promise.all(
        data.sections.map(async (section) => {
          const exportRes = await fetch(
            `/api/export?sectionId=${section.id}`,
          );
          const exportData = await exportRes.json();
          return {
            type: exportData.type,
            html: exportData.html,
            sectionId: section.id,
          };
        }),
      );
      setExports(results);
      setLoading(false);
    };
    load();
  }, [id, router]);

  const handleCopy = async (html: string, sectionId: string) => {
    await navigator.clipboard.writeText(html);
    setCopiedId(sectionId);
    toast.success("Code copié dans le presse-papier");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDownloadImages = async (sectionId: string) => {
    setDownloadingImages(sectionId);
    try {
      const res = await fetch(`/api/export/images?sectionId=${sectionId}`);
      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error || "Erreur lors du téléchargement");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const disposition = res.headers.get("Content-Disposition");
      const match = disposition?.match(/filename="(.+)"/);
      a.download = match?.[1] ?? "images.zip";
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Images téléchargées");
    } catch {
      toast.error("Erreur lors du téléchargement");
    } finally {
      setDownloadingImages(null);
    }
  };

  if (loading || !brief) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-8 flex items-center gap-3">
        <Link href={`/briefs/${id}`}>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-semibold">Export — {brief.slug}</h1>
          <StatusBadge status={brief.status as BriefStatus} />
        </div>
      </div>

      <div className="space-y-6">
        {exports.map((exp) => (
          <div
            key={exp.sectionId}
            className="overflow-hidden rounded-lg border border-border/60 bg-card shadow-sm"
          >
            <div className="flex items-center justify-between border-b border-border/60 px-5 py-3">
              <h3 className="text-sm font-semibold capitalize">{exp.type}</h3>
              <div className="flex items-center gap-2">
                {exp.type === "macarons" && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-lg"
                    disabled={downloadingImages === exp.sectionId}
                    onClick={() => handleDownloadImages(exp.sectionId)}
                  >
                    {downloadingImages === exp.sectionId ? (
                      <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <ImageDown className="mr-1.5 h-3.5 w-3.5" />
                    )}
                    Images (.jpg + .webp)
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-lg"
                  onClick={() => handleCopy(exp.html, exp.sectionId)}
                >
                  {copiedId === exp.sectionId ? (
                    <>
                      <Check className="mr-1.5 h-3.5 w-3.5 text-emerald-600" />
                      Copié
                    </>
                  ) : (
                    <>
                      <Copy className="mr-1.5 h-3.5 w-3.5" />
                      Copier le code
                    </>
                  )}
                </Button>
              </div>
            </div>
            <pre className="max-h-[480px] overflow-auto bg-muted/40 p-5 text-xs leading-relaxed text-foreground/80">
              <code>{exp.html}</code>
            </pre>
          </div>
        ))}

        {exports.length === 0 && (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Aucune section à exporter.
          </p>
        )}
      </div>
    </div>
  );
}
