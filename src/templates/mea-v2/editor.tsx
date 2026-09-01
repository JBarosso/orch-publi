"use client";

import { useState } from "react";
import { Upload } from "lucide-react";
import { toast } from "sonner";
import type { MeaV2Content, MeaV2Card, MeaV2FocusCard } from "@/types";
import { Button } from "@/components/ui/button";
import { ImportCmsDialog } from "@/components/editor/import-cms-dialog";
import { MeaV2CardEditor } from "./mea-v2-card-editor";
import { MeaV2FocusEditor } from "./mea-v2-focus-editor";
import { parseMeaV2HTML } from "./import";

interface MeaV2EditorProps {
  content: MeaV2Content;
  briefWeek: number;
  briefYear: number;
  briefLocale: string;
  onChange: (content: MeaV2Content) => void;
  // "card-0".."card-3" ciblent une carte régulière, "focus" la carte focus
  onOpenMediaLibrary: (target: string) => void;
  onDropFile?: (target: string, file: File) => void;
  onOpenVideoUpload: () => void;
}

export function MeaV2Editor({
  content,
  briefWeek,
  onChange,
  onOpenMediaLibrary,
  onDropFile,
  onOpenVideoUpload,
}: MeaV2EditorProps) {
  const [importOpen, setImportOpen] = useState(false);
  const cards = content.cards ?? [];
  const focus = content.focus;

  const updateCard = (index: number, updates: Partial<MeaV2Card>) => {
    onChange({
      ...content,
      cards: cards.map((c, i) => (i === index ? { ...c, ...updates } : c)),
    });
  };

  const updateFocus = (updates: Partial<MeaV2FocusCard>) => {
    onChange({ ...content, focus: { ...focus, ...updates } });
  };

  const handleImport = (html: string) => {
    const hasContent =
      cards.some((c) => c.title.trim() || c.imageUrl) || focus?.title.trim() || focus?.imageUrl;
    if (hasContent && !window.confirm("Remplacer les cartes MEA v2 actuelles par celles importées du CMS ?")) {
      return;
    }
    try {
      const { content: imported, issueCount } = parseMeaV2HTML(html, briefWeek);
      onChange(imported);
      setImportOpen(false);
      toast.success(
        issueCount > 0
          ? `Cartes importées, ${issueCount} à vérifier (voir commentaires).`
          : "Cartes importées.",
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Échec de l'import");
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-muted-foreground">
          MEA v2 (4 cartes + 1 carte focus)
        </h3>
        <Button variant="outline" size="sm" onClick={() => setImportOpen(true)}>
          <Upload className="mr-1 h-3 w-3" />
          Importer du CMS
        </Button>
      </div>

      <ImportCmsDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        description="Colle le code HTML d'une section MEA v2 déjà exportée vers le CMS : les cartes sont reconstruites automatiquement, les champs non reconnus sont signalés dans leur commentaire."
        onImport={handleImport}
      />

      <div className="space-y-2">
        {cards.map((card, i) => (
          <MeaV2CardEditor
            key={card.id}
            card={card}
            label={`Carte ${i + 1}`}
            briefWeek={briefWeek}
            onUpdate={(updates) => updateCard(i, updates)}
            onOpenMediaLibrary={() => onOpenMediaLibrary(`card-${i}`)}
            onDropFile={onDropFile ? (file) => onDropFile(`card-${i}`, file) : undefined}
          />
        ))}
      </div>

      {focus && (
        <MeaV2FocusEditor
          focus={focus}
          briefWeek={briefWeek}
          onUpdate={updateFocus}
          onOpenMediaLibrary={() => onOpenMediaLibrary("focus")}
          onDropFile={onDropFile ? (file) => onDropFile("focus", file) : undefined}
          onOpenVideoUpload={onOpenVideoUpload}
        />
      )}
    </div>
  );
}
