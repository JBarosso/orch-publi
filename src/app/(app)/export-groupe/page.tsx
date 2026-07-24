"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Copy, Check, Loader2, ImageDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { normalizeTypeLabel } from "@/lib/section-labels";
import type { Brief, BriefSection } from "@/types";

interface BriefWithSections extends Brief {
  sections: BriefSection[];
}

interface TabEntry {
  sectionId: string;
  briefId: string;
  label: string; // "nom du brief — titre de la section"
  html: string;
}

interface Group {
  type: string;
  label: string;
  tabs: TabEntry[];
}

const IMAGE_SECTION_TYPES = new Set([
  "macarons",
  "mea",
  "custom",
  "macarons_v2",
  "mea_v2",
  "edito",
  "carousel",
]);

export default function ExportGroupePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const briefIds = useMemo(
    () => (searchParams.get("briefs") ?? "").split(",").filter(Boolean),
    [searchParams],
  );

  const [loading, setLoading] = useState(true);
  const [groups, setGroups] = useState<Group[]>([]);
  const [activeTab, setActiveTab] = useState<Record<string, string>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [downloading, setDownloading] = useState<string | null>(null);

  useEffect(() => {
    if (briefIds.length === 0) {
      router.push("/");
      return;
    }

    const load = async () => {
      setLoading(true);
      const briefResults = await Promise.all(
        briefIds.map(async (id) => {
          const res = await fetch(`/api/briefs/${id}`);
          if (!res.ok) return null;
          return (await res.json()) as BriefWithSections;
        }),
      );
      const loadedBriefs = briefResults.filter((b): b is BriefWithSections => b !== null);

      // Une entrée par section (pas par brief) : un brief avec 2 sections du
      // même type donne 2 tabs distincts dans ce groupe.
      const flatSections = loadedBriefs.flatMap((brief) =>
        brief.sections
          .filter((s) => s.visible !== false)
          .map((section) => ({ brief, section })),
      );

      const htmlResults = await Promise.all(
        flatSections.map(async ({ brief, section }) => {
          const res = await fetch(`/api/export?sectionId=${section.id}`);
          const data = await res.json();
          return {
            type: section.type,
            sectionId: section.id,
            briefId: brief.id,
            label: `${brief.name || brief.slug} — ${section.title || normalizeTypeLabel(section.type)}`,
            html: data.html as string,
          };
        }),
      );

      const byType = new Map<string, TabEntry[]>();
      for (const entry of htmlResults) {
        const list = byType.get(entry.type) ?? [];
        list.push({
          sectionId: entry.sectionId,
          briefId: entry.briefId,
          label: entry.label,
          html: entry.html,
        });
        byType.set(entry.type, list);
      }

      const nextGroups: Group[] = [...byType.entries()].map(([type, tabs]) => ({
        type,
        label: normalizeTypeLabel(type),
        tabs,
      }));
      setGroups(nextGroups);
      setActiveTab(Object.fromEntries(nextGroups.map((g) => [g.type, g.tabs[0]?.sectionId])));
      setLoading(false);
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [briefIds]);

  const handleCopy = async (html: string, sectionId: string) => {
    await navigator.clipboard.writeText(html);
    setCopiedId(sectionId);
    toast.success("Code copié dans le presse-papier");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const downloadZip = async (key: string, sectionIds: string[], filenameHint: string) => {
    setDownloading(key);
    try {
      const res = await fetch(`/api/export/images/group?sectionIds=${sectionIds.join(",")}`);
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        toast.error(err?.error || "Erreur lors du téléchargement");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filenameHint;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Fichiers téléchargés");
    } catch {
      toast.error("Erreur lors du téléchargement");
    } finally {
      setDownloading(null);
    }
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const allSectionIds = groups.flatMap((g) => g.tabs.map((t) => t.sectionId));

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-8 flex items-center gap-3 flex-wrap justify-between">
        <div className="flex items-center gap-3">
          <Link href="/">
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <h1 className="text-lg font-semibold">
            Export groupé — {briefIds.length} brief{briefIds.length > 1 ? "s" : ""}
          </h1>
        </div>
        <Button
          onClick={() => downloadZip("all", allSectionIds, "export-groupe.zip")}
          disabled={downloading === "all" || allSectionIds.length === 0}
        >
          {downloading === "all" ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <ImageDown className="mr-2 h-4 w-4" />
          )}
          Exporter tous les fichiers
        </Button>
      </div>

      <div className="space-y-6">
        {groups.map((group) => {
          const currentTabId = activeTab[group.type] ?? group.tabs[0]?.sectionId;
          const currentTab = group.tabs.find((t) => t.sectionId === currentTabId) ?? group.tabs[0];
          const groupSectionIds = group.tabs.map((t) => t.sectionId);

          return (
            <div
              key={group.type}
              className="overflow-hidden rounded-lg border border-border/60 bg-card shadow-sm"
            >
              <div className="flex items-center justify-between border-b border-border/60 px-5 py-3">
                <h3 className="text-sm font-semibold">
                  {group.label} ({group.tabs.length})
                </h3>
                <div className="flex items-center gap-2">
                  {IMAGE_SECTION_TYPES.has(group.type) && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-lg"
                      disabled={downloading === group.type}
                      onClick={() =>
                        downloadZip(group.type, groupSectionIds, `${group.label}.zip`)
                      }
                    >
                      {downloading === group.type ? (
                        <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <ImageDown className="mr-1.5 h-3.5 w-3.5" />
                      )}
                      Fichiers ({group.tabs.length} tabs)
                    </Button>
                  )}
                  {currentTab && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-lg"
                      onClick={() => handleCopy(currentTab.html, currentTab.sectionId)}
                    >
                      {copiedId === currentTab.sectionId ? (
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
                  )}
                </div>
              </div>

              {group.tabs.length > 1 && (
                <div className="flex flex-wrap gap-1 border-b border-border/60 bg-muted/30 px-3 py-2">
                  {group.tabs.map((tab) => (
                    <button
                      key={tab.sectionId}
                      type="button"
                      onClick={() =>
                        setActiveTab((prev) => ({ ...prev, [group.type]: tab.sectionId }))
                      }
                      className={cn(
                        "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                        currentTabId === tab.sectionId
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:bg-muted",
                      )}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              )}

              {currentTab && (
                <pre className="max-h-[480px] overflow-auto bg-muted/40 p-5 text-xs leading-relaxed text-foreground/80">
                  <code>{currentTab.html}</code>
                </pre>
              )}
            </div>
          );
        })}

        {groups.length === 0 && (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Aucune section à exporter pour ces briefs.
          </p>
        )}
      </div>
    </div>
  );
}
