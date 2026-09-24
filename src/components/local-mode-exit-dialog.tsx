"use client";

import { useState } from "react";
import { HardDrive, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { setLocalMode } from "@/lib/local-mode";
import { postServerAsset } from "@/lib/post-asset";
import { formatBytes } from "@/lib/upload-specs";
import {
  LOCAL_IMAGES_SENT_EVENT,
  deleteLocalImages,
  type LocalImageRecord,
  type LocalImagesSent,
} from "@/lib/local-images";

/**
 * Sortie du mode local alors que des images sont encore sur ce poste : on le
 * rappelle, et on propose de les envoyer au serveur (poids affiché). Partir
 * sans envoyer les laisse ici : on les retrouve en repassant en mode local.
 */
export function LocalModeExitDialog({
  records,
  onRecordsChange,
}: {
  /** Images encore sur ce poste ; null = popin fermée. */
  records: LocalImageRecord[] | null;
  onRecordsChange: (records: LocalImageRecord[] | null) => void;
}) {
  const [sending, setSending] = useState<number | null>(null);
  const list = records ?? [];
  const weight = formatBytes(list.reduce((sum, r) => sum + r.blob.size, 0));

  const leave = () => {
    setLocalMode(false);
    onRecordsChange(null);
  };

  const send = async () => {
    const urls: Record<string, string> = {};
    const sentIds: string[] = [];
    // Une à une : le poids transite déjà par le navigateur, inutile de
    // saturer la connexion ; et un échec n'emporte pas les autres.
    for (const [i, record] of list.entries()) {
      setSending(i);
      try {
        const res = await postServerAsset(record.blob, {
          label: record.label,
          week: record.week,
          year: record.year,
          type: record.type,
          originUrl: record.originUrl,
        });
        if (res.ok) {
          urls[record.url] = (await res.json()).url;
          sentIds.push(record.id);
        }
      } catch {
        // Comptée comme non envoyée : elle reste sur ce poste.
      }
    }

    if (sentIds.length > 0) {
      const res = await fetch("/api/assets/relink", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ urls }),
      }).catch(() => null);
      if (!res?.ok) {
        // ponytail: les images déjà envoyées restent en médiathèque ; un nouvel
        // essai les renverra en double. Rare (la route ne fait que la base).
        setSending(null);
        toast.error("Images envoyées, mais les briefs n'ont pas pu être mis à jour. Elles restent sur ce poste : réessayez.");
        return;
      }
      const { updatedAt } = await res.json();
      window.dispatchEvent(
        new CustomEvent<LocalImagesSent>(LOCAL_IMAGES_SENT_EVENT, { detail: { urls, updatedAt } }),
      );
      // Nettoyage seulement une fois les briefs pointés vers le serveur.
      await deleteLocalImages(sentIds);
    }

    setSending(null);
    const left = list.filter((r) => !sentIds.includes(r.id));
    if (left.length === 0) {
      toast.success(`${sentIds.length} image${sentIds.length > 1 ? "s" : ""} envoyée${sentIds.length > 1 ? "s" : ""} au serveur`);
      leave();
    } else {
      toast.error(
        `${left.length} image${left.length > 1 ? "s n'ont" : " n'a"} pas pu être envoyée${left.length > 1 ? "s" : ""} : elle${left.length > 1 ? "s restent" : " reste"} sur ce poste.`,
      );
      onRecordsChange(left);
    }
  };

  return (
    <Dialog open={records !== null} onOpenChange={(open) => !open && sending === null && onRecordsChange(null)}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <HardDrive className="h-4 w-4 text-amber-600" />
            Quitter le mode local
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 text-sm text-muted-foreground">
          <p>
            <strong className="text-foreground">
              {list.length} image{list.length > 1 ? "s" : ""} ({weight})
            </strong>{" "}
            {list.length > 1 ? "sont" : "est"} uniquement sur ce poste, pas sur le serveur : vos collègues voient une
            image de remplacement à la place.
          </p>
          <ul className="list-disc space-y-1 pl-5">
            <li>
              <strong className="text-foreground">Envoyer au serveur</strong> : {weight} envoyés vers la médiathèque,
              les briefs sont mis à jour et ce poste est vidé.
            </li>
            <li>
              <strong className="text-foreground">Quitter sans envoyer</strong> : rien ne part, les images restent ici.
              Vous les retrouverez en repassant en mode local.
            </li>
          </ul>
        </div>
        <DialogFooter className="sm:flex-wrap">
          <Button variant="outline" onClick={() => onRecordsChange(null)} disabled={sending !== null}>
            Rester en mode local
          </Button>
          <Button variant="outline" onClick={leave} disabled={sending !== null}>
            Quitter sans envoyer
          </Button>
          <Button onClick={send} disabled={sending !== null}>
            {sending !== null && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
            {sending !== null ? `Envoi ${sending + 1}/${list.length}…` : `Envoyer au serveur (${weight})`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
