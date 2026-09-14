"use client";

import { use, useState } from "react";
import Link from "next/link";
import { ArrowLeft, FileCode, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ConfirmDeleteDialog } from "@/components/editor/confirm-delete-dialog";
import { ImageUploadDialog } from "@/components/media/image-upload-dialog";
import { TEMPLATE_UI } from "@/templates/registry-ui";
import type { AssetType } from "@/types";
import { DEMO_BASE } from "../../_demo/config";
import { GalleryDialog } from "../../_demo/gallery-dialog";
import { DemoLoading, DemoNotFound } from "../../_demo/states";
import {
  DEMO_SECTION_LABELS,
  DEMO_SECTION_TYPES,
  briefLabel,
  createDemoSection,
  updateDemoBrief,
  useDemoBriefs,
  type DemoSection,
} from "../../_demo/store";

// Cible d'un emplacement image : "gallery" pour la médiathèque réduite,
// "upload" pour l'upload direct — clic sur "Uploader une image" (fichier
// choisi ensuite) ou glisser-déposer sur l'emplacement (fichier déjà connu),
// comme dans la vraie app.
type MediaAction =
  | { mode: "gallery"; sectionId: string; target: string; assetType: AssetType }
  | { mode: "upload"; sectionId: string; target: string; assetType: AssetType; file?: File };

function kindFor(assetType: AssetType) {
  return assetType === "macaron_v2" ? "quickaccess" : "mea";
}

export default function DemoBriefPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const briefs = useDemoBriefs();
  const [mediaAction, setMediaAction] = useState<MediaAction | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  if (!briefs) return <DemoLoading />;
  const brief = briefs.find((b) => b.id === id);
  if (!brief) return <DemoNotFound />;

  // Pas de bouton « Sauvegarder » : chaque modification est écrite dans le navigateur.
  const updateSections = (updater: (sections: DemoSection[]) => DemoSection[]) =>
    updateDemoBrief(id, (b) => ({ ...b, sections: updater(b.sections) }));

  const updateSection = (sectionId: string, updater: (section: DemoSection) => DemoSection) =>
    updateSections((sections) => sections.map((s) => (s.id === sectionId ? updater(s) : s)));

  // Même rangement que dans la vraie app (registre UI) : semaine et position
  // figées redeviennent dynamiques.
  const applyImage = (action: { sectionId: string; target: string }, url: string) =>
    updateSection(action.sectionId, (s) => ({
      ...s,
      content: TEMPLATE_UI[s.type].setImage!(s.content, action.target, url),
    }));

  const briefCtx = { year: brief.year, week: brief.week, locale: brief.locale };

  return (
    <div className="flex h-full flex-col">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-border/60 bg-card px-5 py-3">
        <div className="flex items-center gap-3">
          <Link href={DEMO_BASE}>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <h1 className="text-[15px] font-semibold">{briefLabel(brief)}</h1>
          <span className="rounded-md bg-muted px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground">
            {brief.year} · S{String(brief.week).padStart(2, "0")} · {brief.locale}
          </span>
        </div>
        <Link href={`${DEMO_BASE}/briefs/${id}/export`}>
          <Button size="sm" className="rounded-lg shadow-sm shadow-primary/20">
            <FileCode className="mr-1.5 h-3.5 w-3.5" />
            Exporter
          </Button>
        </Link>
      </header>

      <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-2">
        <div className="overflow-y-auto border-r border-border/60 p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
              Éditeur
            </h2>
            <div className="flex gap-2">
              {DEMO_SECTION_TYPES.map((type) => (
                <Button
                  key={type}
                  size="sm"
                  variant="outline"
                  onClick={() => updateSections((sections) => [...sections, createDemoSection(type)])}
                >
                  <Plus className="mr-1.5 h-3.5 w-3.5" />
                  {DEMO_SECTION_LABELS[type]}
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            {brief.sections.length === 0 && (
              <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                Aucune section. Ajoutez un Quickaccess v2 ou une MEA v2 pour commencer.
              </div>
            )}
            {brief.sections.map((section) => {
              const Editor = TEMPLATE_UI[section.type].Editor!;
              return (
                <div key={section.id} className="rounded-lg border border-border/60 bg-card shadow-sm">
                  <div className="flex items-center justify-between gap-3 border-b border-border/60 px-4 py-3">
                    <Input
                      value={section.title}
                      onChange={(e) => updateSection(section.id, (s) => ({ ...s, title: e.target.value }))}
                      className="h-8 w-full max-w-80"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      title="Supprimer la section"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      onClick={() => setPendingDeleteId(section.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  <div className="px-4 py-4">
                    <Editor
                      minimal
                      content={section.content}
                      brief={briefCtx}
                      onChange={(content) => updateSection(section.id, (s) => ({ ...s, content }))}
                      onOpenMedia={(target, assetType) =>
                        setMediaAction({ mode: "gallery", sectionId: section.id, target, assetType })
                      }
                      onDropFile={(target, assetType, file) =>
                        setMediaAction({ mode: "upload", sectionId: section.id, target, assetType, file })
                      }
                      onOpenVideoUpload={() => {}}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="overflow-y-auto p-6">
          <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
            Aperçu
          </h2>
          <div className="space-y-3">
            {brief.sections.map((section) => {
              const Preview = TEMPLATE_UI[section.type].Preview!;
              return (
                <div key={section.id} className="space-y-1.5">
                  <p className="text-[11px] font-medium text-muted-foreground/80">
                    {section.title || DEMO_SECTION_LABELS[section.type]}
                  </p>
                  <Preview content={section.content} />
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {mediaAction?.mode === "gallery" && (
        <GalleryDialog
          kind={kindFor(mediaAction.assetType)}
          onClose={() => setMediaAction(null)}
          onUploadNew={() => setMediaAction({ ...mediaAction, mode: "upload" })}
          onSelect={(url) => {
            applyImage(mediaAction, url);
            setMediaAction(null);
          }}
        />
      )}

      {mediaAction?.mode === "upload" && (
        <ImageUploadDialog
          localOnly
          assetType={mediaAction.assetType}
          initialFile={mediaAction.file}
          defaultWeek={brief.week}
          defaultYear={brief.year}
          onUploaded={(url) => {
            applyImage(mediaAction, url);
            setMediaAction(null);
          }}
          onClose={() => setMediaAction(null)}
        />
      )}

      <ConfirmDeleteDialog
        open={!!pendingDeleteId}
        onOpenChange={(open) => !open && setPendingDeleteId(null)}
        title="Supprimer cette section ?"
        description="Cette action est irréversible."
        onConfirm={() => {
          const sectionId = pendingDeleteId;
          updateSections((sections) => sections.filter((s) => s.id !== sectionId));
          setPendingDeleteId(null);
        }}
      />
    </div>
  );
}
