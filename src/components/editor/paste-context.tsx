"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { Languages } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/** true = traduire, false = coller sans traduire, null = annuler le collage. */
type TranslateChoice = boolean | null;

/**
 * Fenêtre « traduire ou non » du collage d'une langue à l'autre, à la manière
 * d'un confirm() : `ask` renvoie une promesse résolue par le choix fait.
 */
export function useTranslateConfirm() {
  const [pending, setPending] = useState<{
    from: string;
    to: string;
    resolve: (choice: TranslateChoice) => void;
  } | null>(null);

  const ask = (from: string, to: string) =>
    new Promise<TranslateChoice>((resolve) => setPending({ from, to, resolve }));

  const close = (choice: TranslateChoice) => {
    pending?.resolve(choice);
    setPending(null);
  };

  const dialog = (
    <Dialog open={!!pending} onOpenChange={(open) => !open && close(null)}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Languages className="h-4 w-4 text-primary" />
            Traduire le contenu collé ?
          </DialogTitle>
          <DialogDescription>
            Il vient d&apos;un brief {pending?.from.toUpperCase()}, vous le collez dans un brief{" "}
            {pending?.to.toUpperCase()}. La traduction passe par le glossaire (onglet Traduction) ;
            les textes absents du glossaire sont signalés dans le commentaire de l&apos;item.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="ghost" onClick={() => close(null)}>
            Annuler
          </Button>
          <Button variant="outline" onClick={() => close(false)}>
            Coller sans traduire
          </Button>
          <Button onClick={() => close(true)}>Traduire</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  return { ask, dialog };
}

interface PasteContextValue {
  /** Brief en cours d'édition : cible des collages. */
  week: number;
  locale: string;
  askTranslate: (from: string, to: string) => Promise<TranslateChoice>;
}

const PasteContext = createContext<PasteContextValue | null>(null);

export function PasteProvider({ value, children }: { value: PasteContextValue; children: ReactNode }) {
  return <PasteContext.Provider value={value}>{children}</PasteContext.Provider>;
}

/** null hors d'un brief (ex: éditeur de templates) : copier/coller d'items indisponible. */
export function usePasteContext(): PasteContextValue | null {
  return useContext(PasteContext);
}
