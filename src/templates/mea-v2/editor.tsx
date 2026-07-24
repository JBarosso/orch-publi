"use client";

import type { MeaV2Content, MeaV2Card, MeaV2FocusCard } from "@/types";
import { MeaV2CardEditor } from "./mea-v2-card-editor";
import { MeaV2FocusEditor } from "./mea-v2-focus-editor";

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

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-muted-foreground">
        MEA v2 (4 cartes + 1 carte focus)
      </h3>

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
