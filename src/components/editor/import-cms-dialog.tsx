"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ImportCmsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  description: string;
  onImport: (html: string) => void;
}

/** Dialog générique "coller du code CMS" partagé par les templates important
 * du HTML déjà exporté (quickaccess v2, MEA v2) — le parsing est propre à
 * chaque appelant, ce composant ne fait que collecter le texte collé. */
export function ImportCmsDialog({ open, onOpenChange, description, onImport }: ImportCmsDialogProps) {
  const [html, setHtml] = useState("");
  // Ne vide le champ qu'à la fermeture du dialog (annulation ou import
  // réussi côté appelant) — pas à chaque clic sur "Importer" : si l'appelant
  // annule (ex: confirmation de remplacement refusée), le texte collé reste
  // pour que l'utilisateur n'ait pas à tout recoller. Ajusté pendant le
  // rendu (pas dans un effet) suivant le pattern React recommandé pour
  // réinitialiser un état en réponse au changement d'une prop.
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (!open) setHtml("");
  }

  const handleImport = () => {
    if (!html.trim()) return;
    onImport(html);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Importer depuis le CMS</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <Textarea
          placeholder="Collez ici le code HTML récupéré depuis le CMS…"
          value={html}
          onChange={(e) => setHtml(e.target.value)}
          rows={14}
          className="max-h-[400px] overflow-y-auto font-mono text-xs"
        />
        <DialogFooter className="sm:flex-wrap">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button onClick={handleImport} disabled={!html.trim()}>
            Importer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
