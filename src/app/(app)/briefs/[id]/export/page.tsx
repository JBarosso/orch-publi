"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, ImageDown, AlertTriangle, CheckCircle2, Info, Video } from "lucide-react";
import { hasCmsAsset, resolveCmsAsset } from "@/lib/cms-asset";
import type { VideoEntry } from "@/lib/section-videos";
import { Button } from "@/components/ui/button";
import { CopyCodeButton } from "@/components/editor/copy-code-button";
import { toast } from "sonner";
import type {
  Brief,
  BriefSection,
  BriefStatus,
  MacaronsContent,
  MeaContent,
  MeaV2Content,
  EditoContent,
  CarouselContent,
  ArianeContent,
  GlobalHeaderContent,
  CustomContent,
  ImgSousMenuContent,
  CatBannerContent,
  CmsPage,
  MiniatureOffreContent,
} from "@/types";
import { StatusBadge } from "@/components/briefs/status-badge";
import { validateMacaronsContent } from "@/templates/macarons/schema";
import { validateMeaContent } from "@/templates/mea/schema";
import { validateMeaV2Content } from "@/templates/mea-v2/schema";
import { validateEditoContent } from "@/templates/edito/schema";
import { validateCarouselContent } from "@/templates/carousel/schema";
import { validateArianeContent } from "@/templates/ariane/schema";
import { validateGlobalHeaderContent } from "@/templates/global-header/schema";
import { validateCustomContent } from "@/templates/custom/schema";
import { validateImgSousMenuContent } from "@/templates/img-sous-menu/schema";
import { validateCatBannerContent } from "@/templates/cat-banner/schema";
import { validateMiniatureOffreContent } from "@/templates/miniature-offre/schema";
import { generateCatBannerItemHTML } from "@/templates/cat-banner/export";
import { cmsLocalePath } from "@/lib/utils";

function validateSectionContent(section: BriefSection): string[] {
  switch (section.type) {
    case "macarons":
    case "macarons_v2":
      return validateMacaronsContent((section.content as MacaronsContent).items ?? []);
    case "mea":
      return validateMeaContent((section.content as MeaContent).items ?? []);
    case "mea_v2":
      return validateMeaV2Content(section.content as MeaV2Content);
    case "edito":
      return validateEditoContent((section.content as EditoContent).items ?? []);
    case "carousel":
      return validateCarouselContent(section.content as CarouselContent);
    case "ariane":
      return validateArianeContent(section.content as ArianeContent);
    case "global_header":
      return validateGlobalHeaderContent(section.content as GlobalHeaderContent);
    case "custom":
      return validateCustomContent(section.content as CustomContent);
    case "img_sous_menu":
      return validateImgSousMenuContent((section.content as ImgSousMenuContent).items ?? []);
    case "cat_banner":
      return validateCatBannerContent((section.content as CatBannerContent).items ?? []);
    case "miniature_offre":
      return validateMiniatureOffreContent((section.content as MiniatureOffreContent).items ?? []);
    default:
      return [];
  }
}

interface BriefWithSections extends Brief {
  sections: BriefSection[];
}

/**
 * Les vidéos ne sont plus hébergées par l'outil ni placées dans le ZIP :
 * l'intégrateur les télécharge à leur adresse et les dépose dans le CMS au
 * chemin attendu par le HTML ci-dessus.
 */
function VideosToFetch({ videos }: { videos: VideoEntry[] }) {
  return (
    <div className="border-t border-border/60 bg-amber-50/60 px-5 py-4">
      <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-amber-900">
        <Video className="h-3.5 w-3.5" />
        Vidéos à récupérer et à déposer dans le CMS
      </p>
      <ul className="space-y-2">
        {videos.map((video) => (
          <li key={video.cmsPath} className="text-xs text-amber-900/90">
            <span className="font-medium">{video.slot}</span>
            <div className="mt-0.5 break-all">
              source :{" "}
              {video.sourceUrl ? (
                <a href={video.sourceUrl} target="_blank" rel="noreferrer" className="underline">
                  {video.sourceUrl}
                </a>
              ) : (
                <span className="font-medium text-amber-700">adresse non renseignée dans le brief</span>
              )}
            </div>
            <div className="break-all">
              à déposer dans : <code className="rounded bg-amber-100 px-1">{video.cmsPath}</code>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Asset Salesforce où coller le code de la section — informatif. Absent pour
 * les sections sans code à coller ; signalé discrètement quand il manque, pour
 * penser à choisir la page de la section (ou compléter l'onglet Assets CMS).
 */
function CmsAssetBadge({ section, pages }: { section?: BriefSection; pages: CmsPage[] }) {
  if (!section || !hasCmsAsset(section.type)) return null;
  const { assetId, page } = resolveCmsAsset(
    { type: section.type, cmsPageId: section.cmsPageId ?? null, cmsAssetId: section.cmsAssetId ?? "" },
    pages,
  );

  if (!assetId) {
    return (
      <span className="flex items-center gap-1 text-[11px] text-muted-foreground/70">
        <Info className="h-3 w-3" />
        {page ? `Aucun asset défini pour « ${page.name} »` : "Asset CMS non renseigné"}
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={() => {
        navigator.clipboard.writeText(assetId);
        toast.success("Identifiant d'asset copié");
      }}
      title={`Asset Salesforce où coller ce code${page ? ` (page « ${page.name} »)` : ""} — cliquer pour copier l'identifiant`}
      className="flex items-center gap-1 rounded-md bg-primary/10 px-2 py-0.5 text-[11px] text-primary transition-colors hover:bg-primary/15"
    >
      <Info className="h-3 w-3" />
      Asset CMS : <span className="font-mono">{assetId}</span>
    </button>
  );
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
    {
      type: string;
      title: string;
      html: string;
      sectionId: string;
      content: unknown;
      videos: VideoEntry[];
    }[]
  >([]);
  const [downloadingImages, setDownloadingImages] = useState<string | null>(null);
  const [skippedCount, setSkippedCount] = useState(0);
  const [cmsPages, setCmsPages] = useState<CmsPage[]>([]);

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/cms-pages");
      if (res.ok) setCmsPages(await res.json());
    })();
  }, []);
  const [warnings, setWarnings] = useState<{ sectionId: string; title: string; message: string }[]>([]);

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

      // Les sections avec le toggle "Export" désactivé sont informatives : ignorées
      const exportableSections = data.sections.filter((s) => s.visible !== false);
      setSkippedCount(data.sections.length - exportableSections.length);

      setWarnings(
        exportableSections.flatMap((section) =>
          validateSectionContent(section).map((message) => ({
            sectionId: section.id,
            title: section.title || section.type,
            message,
          })),
        ),
      );

      const results = await Promise.all(
        exportableSections.map(async (section) => {
          const exportRes = await fetch(
            `/api/export?sectionId=${section.id}`,
          );
          const exportData = await exportRes.json();
          return {
            type: exportData.type,
            title: section.title || exportData.type,
            html: exportData.html,
            sectionId: section.id,
            content: section.content,
            videos: (exportData.videos ?? []) as VideoEntry[],
          };
        }),
      );
      setExports(results);
      setLoading(false);
    };
    load();
  }, [id, router]);

  // key = sectionId ou "all" (pilote le spinner du bouton correspondant)
  const handleDownloadImages = async (key: string, query: string, fallbackName: string) => {
    setDownloadingImages(key);
    try {
      const res = await fetch(`/api/export/images?${query}`);
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
      a.download = match?.[1] ?? fallbackName;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Fichiers téléchargés");
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
      <div className="mb-8 flex items-center gap-3 flex-wrap justify-between">
        <div className="flex items-center gap-3">
          <Link href={`/briefs/${id}`}>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-lg font-semibold">Export — {brief.slug}</h1>
            <StatusBadge status={brief.status as BriefStatus} />
          </div>
        </div>
        <div>
          <Button
            onClick={() => handleDownloadImages("all", `briefId=${id}`, "tous-les-fichiers.zip")}
            disabled={downloadingImages === "all" || exports.length === 0}
          >
            {downloadingImages === "all" ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <ImageDown className="mr-2 h-4 w-4" />
            )}
            Exporter tous les fichiers
          </Button>
        </div>
      </div>

      {warnings.length > 0 ? (
        <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/60 dark:bg-amber-950/30">
          <div className="mb-2 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-500" />
            <h2 className="text-sm font-semibold text-amber-800 dark:text-amber-400">
              {warnings.length} point{warnings.length > 1 ? "s" : ""} à vérifier avant export
            </h2>
          </div>
          <ul className="list-inside list-disc space-y-1 text-xs text-amber-700 dark:text-amber-400/90">
            {warnings.map((w, i) => (
              <li key={i}>
                <strong>{w.title}</strong> — {w.message}
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="mb-6 flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-500">
          <CheckCircle2 className="h-3.5 w-3.5" />
          Aucun problème détecté
        </div>
      )}

      <div className="space-y-6">
        {exports.map((exp) => (
          <div
            key={exp.sectionId}
            className="overflow-hidden rounded-lg border border-border/60 bg-card shadow-sm"
          >
            <div className="flex items-center justify-between border-b border-border/60 px-5 py-3">
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <h3 className="text-sm font-semibold">{exp.title}</h3>
                <CmsAssetBadge section={brief.sections.find((s) => s.id === exp.sectionId)} pages={cmsPages} />
              </div>
              <div className="flex items-center gap-2">
                {(exp.type === "macarons" ||
                  exp.type === "mea" ||
                  exp.type === "custom" ||
                  exp.type === "macarons_v2" ||
                  exp.type === "mea_v2" ||
                  exp.type === "edito" ||
                  exp.type === "carousel" ||
                  exp.type === "img_sous_menu" ||
                  exp.type === "cat_banner" ||
                  exp.type === "miniature_offre") && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-lg"
                    disabled={downloadingImages === exp.sectionId}
                    onClick={() =>
                      handleDownloadImages(exp.sectionId, `sectionId=${exp.sectionId}`, "fichiers.zip")
                    }
                  >
                    {downloadingImages === exp.sectionId ? (
                      <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <ImageDown className="mr-1.5 h-3.5 w-3.5" />
                    )}
                    Fichiers
                  </Button>
                )}
                {exp.type !== "img_sous_menu" &&
                  exp.type !== "miniature_offre" &&
                  exp.type !== "cat_banner" &&
                  exp.type !== "moodboard" && <CopyCodeButton text={exp.html} />}
              </div>
            </div>
            {exp.type === "moodboard" ? (
              <p className="px-5 py-4 text-xs text-muted-foreground">
                Section purement informative — jamais exportée (ni HTML, ni images), visible seulement dans l&apos;aperçu.
              </p>
            ) : exp.type === "img_sous_menu" || exp.type === "miniature_offre" ? (
              <p className="px-5 py-4 text-xs text-muted-foreground">
                Pas de HTML pour ce type de section — seuls les fichiers image sont à exporter.
              </p>
            ) : exp.type === "cat_banner" ? (
              <div className="divide-y divide-border/60">
                {((exp.content as CatBannerContent)?.items ?? []).map((item) => (
                  <div key={item.id} className="px-5 py-4">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-xs font-medium text-muted-foreground">
                        {item.label || "Sans nom"}
                        {item.pageId?.trim() && (
                          <span className="ml-2 font-normal">· page : {item.pageId.trim()}</span>
                        )}
                      </span>
                      <CopyCodeButton
                        text={generateCatBannerItemHTML(item, {
                          year: brief.year,
                          week: brief.week,
                          locale: cmsLocalePath(brief.locale),
                        })}
                      />
                    </div>
                    <pre className="max-h-60 overflow-auto rounded-md bg-muted/40 p-3 text-xs leading-relaxed text-foreground/80">
                      <code>
                        {generateCatBannerItemHTML(item, {
                          year: brief.year,
                          week: brief.week,
                          locale: cmsLocalePath(brief.locale),
                        })}
                      </code>
                    </pre>
                  </div>
                ))}
                {((exp.content as CatBannerContent)?.items ?? []).length === 0 && (
                  <p className="px-5 py-4 text-xs text-muted-foreground">Aucune bannière.</p>
                )}
              </div>
            ) : (
              <pre className="max-h-120 overflow-auto bg-muted/40 p-5 text-xs leading-relaxed text-foreground/80">
                <code>{exp.html}</code>
              </pre>
            )}

            {exp.videos.length > 0 && <VideosToFetch videos={exp.videos} />}
          </div>
        ))}

        {exports.length === 0 && (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Aucune section à exporter.
          </p>
        )}

        {skippedCount > 0 && (
          <p className="text-center text-xs text-muted-foreground">
            {skippedCount} section(s) non exportée(s) (toggle « Export »
            désactivé dans l&apos;éditeur).
          </p>
        )}
      </div>
    </div>
  );
}
