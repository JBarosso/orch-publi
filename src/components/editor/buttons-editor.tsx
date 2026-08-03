"use client";

import { Plus, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { LinkFields } from "./link-fields";
import type { MeaButton } from "@/types";

interface ButtonsEditorProps {
  buttons: MeaButton[];
  onChange: (buttons: MeaButton[]) => void;
  /** En dessous, la croix de suppression est masquée (1 pour MEA/edito, 0 pour carousel) */
  minButtons?: number;
  /** Texte pré-rempli d'un nouveau bouton */
  newButtonText?: string;
  cgidPlaceholder?: string;
  cidPlaceholder?: string;
}

/**
 * Liste de boutons (texte + lien cgid/cid/URL + suppression) partagée par les
 * éditeurs MEA, edito, MEA v2 et carousel.
 */
export function ButtonsEditor({
  buttons,
  onChange,
  minButtons = 1,
  newButtonText = "Découvrir",
  cgidPlaceholder,
  cidPlaceholder,
}: ButtonsEditorProps) {
  const updateButton = (index: number, updates: Partial<MeaButton>) => {
    onChange(buttons.map((btn, i) => (i === index ? { ...btn, ...updates } : btn)));
  };

  const addButton = () => {
    onChange([
      ...buttons,
      { text: newButtonText, linkType: "cgid", cgid: "", cid: "", link: "" },
    ]);
  };

  const removeButton = (index: number) => {
    if (buttons.length <= minButtons) return;
    onChange(buttons.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-1.5 pt-1 border-t">
      {buttons.map((btn, idx) => (
        <div key={idx} className="flex items-center gap-2">
          <Input
            placeholder={`Bouton ${idx + 1}`}
            value={btn.text}
            onChange={(e) => updateButton(idx, { text: e.target.value })}
            className="h-7 w-24 text-xs shrink-0"
          />
          <LinkFields
            linkType={btn.linkType}
            cgid={btn.cgid}
            cid={btn.cid}
            link={btn.link}
            onChange={(updates) => updateButton(idx, updates)}
            cgidPlaceholder={cgidPlaceholder}
            cidPlaceholder={cidPlaceholder}
          />
          {buttons.length > minButtons && (
            <button
              type="button"
              onClick={() => removeButton(idx)}
              className="text-muted-foreground/40 hover:text-destructive transition-colors p-0.5"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      ))}
      <button
        type="button"
        onClick={addButton}
        className="flex items-center gap-1 text-xs text-muted-foreground/60 hover:text-primary transition-colors"
      >
        <Plus className="h-3 w-3" />
        <span>Ajouter un bouton</span>
      </button>
    </div>
  );
}
