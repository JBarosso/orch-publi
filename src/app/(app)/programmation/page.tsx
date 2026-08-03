"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BrushCleaning,
  CalendarDays,
  CalendarRange,
  Check,
  Download,
  Loader2,
  Pencil,
  Plus,
  Puzzle,
  Trash2,
  X,
} from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ConfirmDeleteDialog } from "@/components/editor/confirm-delete-dialog";
import { toast } from "sonner";
import type { ProgrammationBlock, ProgrammationCountry } from "@/types";
import { PROGRAMMATION_COUNTRIES } from "@/types";
import {
  clearCapturedProgrammations,
  getCapturedProgrammations,
  mapLocalesToCountries,
  parseSalesforceDate,
} from "@/lib/salesforce-extension";

// Comparaison directe de chaînes ISO (YYYY-MM-DD) : même piège de fuseau
// horaire que formatDate ci-dessous, donc pas de new Date() ici non plus.
function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function sortBlocks(blocks: ProgrammationBlock[]): ProgrammationBlock[] {
  return [...blocks].sort((a, b) => {
    const labelCmp = a.label.localeCompare(b.label, "fr", { sensitivity: "base" });
    if (labelCmp !== 0) return labelCmp;
    if (!a.startDate && !b.startDate) return 0;
    if (!a.startDate) return 1;
    if (!b.startDate) return -1;
    return a.startDate.localeCompare(b.startDate);
  });
}

// Évite le décalage de fuseau horaire d'un new Date("YYYY-MM-DD") : on
// formate directement la chaîne ISO plutôt que de reconstruire un objet Date.
function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

function DateTag({ iso }: { iso: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-muted px-4 py-1 text-sm font-medium">
      <CalendarDays className="h-2.5 w-2.5" />
      {formatDate(iso)}
    </span>
  );
}

function BlockView({
  block,
  onEdit,
  onDelete,
}: {
  block: ProgrammationBlock;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const hasDates = block.startDate || block.endDate;
  return (
    <div className="group space-y-1.5 rounded-lg border border-border/60 bg-card p-3 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-sm font-semibold text-foreground">{block.label || "Sans nom"}</h3>
        <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onEdit} title="Éditer">
            <Pencil className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-muted-foreground hover:text-destructive"
            onClick={onDelete}
            title="Supprimer"
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {hasDates && (
        <div className="flex flex-wrap items-center gap-1">
          {block.startDate && <DateTag iso={block.startDate} />}
          {block.startDate && block.endDate && <span className="text-[10px] text-muted-foreground">→</span>}
          {block.endDate && <DateTag iso={block.endDate} />}
        </div>
      )}

      {block.comment && (
        <p className="line-clamp-2 text-[11px] italic text-muted-foreground/70">{block.comment}</p>
      )}
    </div>
  );
}

function BlockEditForm({
  block,
  onSave,
  onCancel,
}: {
  block: ProgrammationBlock;
  onSave: (id: string, patch: Partial<ProgrammationBlock>) => void;
  onCancel: () => void;
}) {
  const [label, setLabel] = useState(block.label);
  const [startDate, setStartDate] = useState(block.startDate ?? "");
  const [endDate, setEndDate] = useState(block.endDate ?? "");
  const [comment, setComment] = useState(block.comment);

  const handleSubmit = () => {
    onSave(block.id, { label: label.trim(), startDate: startDate || null, endDate: endDate || null, comment });
  };

  return (
    <div className="space-y-2 rounded-lg border border-primary/40 bg-card p-3 shadow-sm">
      <Input
        autoFocus
        value={label}
        placeholder="Nom de l'asset"
        onChange={(e) => setLabel(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") handleSubmit();
          if (e.key === "Escape") onCancel();
        }}
        className="h-8 text-sm"
      />

      <div className="flex items-center gap-1.5">
        <Input
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          className="h-8 text-xs"
          title="Date de début"
        />
        <span className="text-xs text-muted-foreground">→</span>
        <Input
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          className="h-8 text-xs"
          title="Date de fin"
        />
      </div>

      <textarea
        value={comment}
        placeholder="Commentaire (optionnel)"
        onChange={(e) => setComment(e.target.value)}
        rows={2}
        className="w-full resize-none rounded-md border border-input bg-transparent px-2 py-1.5 text-xs text-foreground placeholder:text-muted-foreground/60 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
      />

      <div className="flex justify-end gap-1.5">
        <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={onCancel}>
          <X className="mr-1 h-3.5 w-3.5" />
          Annuler
        </Button>
        <Button size="sm" className="h-7 px-2 text-xs" onClick={handleSubmit}>
          <Check className="mr-1 h-3.5 w-3.5" />
          Enregistrer
        </Button>
      </div>
    </div>
  );
}

function BlockCard({
  block,
  editing,
  onEdit,
  onCancelEdit,
  onSave,
  onDelete,
}: {
  block: ProgrammationBlock;
  editing: boolean;
  onEdit: () => void;
  onCancelEdit: () => void;
  onSave: (id: string, patch: Partial<ProgrammationBlock>) => void;
  onDelete: () => void;
}) {
  if (editing) {
    return <BlockEditForm block={block} onSave={onSave} onCancel={onCancelEdit} />;
  }
  return <BlockView block={block} onEdit={onEdit} onDelete={onDelete} />;
}

export default function ProgrammationPage() {
  const [blocks, setBlocks] = useState<ProgrammationBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmCleanOpen, setConfirmCleanOpen] = useState(false);
  const [cleaning, setCleaning] = useState(false);
  const [importing, setImporting] = useState(false);

  const fetchBlocks = useCallback(async () => {
    const res = await fetch("/api/programmation");
    if (!res.ok) {
      toast.error("Impossible de charger la programmation");
      setLoading(false);
      return;
    }
    setBlocks(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => {
    // Identique au pattern fetchTemplates/fetchBriefs utilisé ailleurs dans
    // l'app (templates/page.tsx, briefs-list.tsx), qui ne déclenche pas cette
    // règle sur ces fichiers — faux positif apparent de la règle sur ce fichier.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchBlocks();
  }, [fetchBlocks]);

  const handleCreate = async (country: ProgrammationCountry) => {
    const res = await fetch("/api/programmation", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ country, label: "" }),
    });
    if (!res.ok) {
      toast.error("Erreur lors de la création");
      return;
    }
    const created: ProgrammationBlock = await res.json();
    setEditingId(created.id);
    fetchBlocks();
  };

  const handleSave = async (id: string, patch: Partial<ProgrammationBlock>) => {
    const res = await fetch("/api/programmation", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...patch }),
    });
    if (!res.ok) {
      toast.error("Erreur lors de la sauvegarde");
      return;
    }
    setEditingId(null);
    fetchBlocks();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Supprimer ce bloc ?")) return;
    const res = await fetch("/api/programmation", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (!res.ok) {
      toast.error("Erreur lors de la suppression");
      return;
    }
    if (editingId === id) setEditingId(null);
    fetchBlocks();
  };

  const expiredBlocks = useMemo(() => {
    const today = todayIso();
    return blocks.filter((b) => b.endDate && b.endDate < today);
  }, [blocks]);

  const handleCleanExpired = async () => {
    setCleaning(true);
    try {
      const results = await Promise.all(
        expiredBlocks.map((b) =>
          fetch("/api/programmation", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: b.id }),
          }),
        ),
      );
      const failed = results.filter((r) => !r.ok).length;
      if (failed > 0) {
        toast.error(`${failed} bloc(s) n'ont pas pu être supprimés`);
      } else {
        toast.success(`${expiredBlocks.length} programmation(s) passée(s) supprimée(s)`);
      }
      if (expiredBlocks.some((b) => b.id === editingId)) setEditingId(null);
      fetchBlocks();
    } finally {
      setCleaning(false);
    }
  };

  const handleImportFromExtension = async () => {
    setImporting(true);
    try {
      const captured = await getCapturedProgrammations();
      if (captured.length === 0) {
        toast.info("Aucune programmation à importer depuis l'extension");
        return;
      }

      const creations = captured.flatMap((item) => {
        const countries = mapLocalesToCountries(item.locales);
        return countries.map((country) =>
          fetch("/api/programmation", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              country,
              label: item.label,
              startDate: parseSalesforceDate(item.displayFrom),
              endDate: parseSalesforceDate(item.displayTo),
            }),
          }),
        );
      });

      if (creations.length === 0) {
        toast.error("Aucune locale importée n'a pu être associée à un pays (FR/BE/ES/GR)");
        return;
      }

      const results = await Promise.all(creations);
      const failed = results.filter((r) => !r.ok).length;
      if (failed > 0) toast.error(`${failed} bloc(s) n'ont pas pu être créés`);
      else toast.success(`${creations.length} programmation(s) importée(s)`);

      // Ne vide l'extension que si l'import a réussi — sinon l'utilisateur
      // perdrait ses captures sur une erreur réseau/API.
      if (failed === 0) await clearCapturedProgrammations();

      fetchBlocks();
    } catch {
      toast.error("Extension introuvable — installez-la puis réessayez (voir README)");
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-8 flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="flex items-center gap-2.5 text-2xl font-bold tracking-tight text-foreground">
            <CalendarRange className="h-6 w-6 text-primary" />
            Programmation
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Tableau informatif — planifiez vos assets par pays, avec une période optionnelle.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <a
            href="/salesforce-extension.zip"
            download
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            <Puzzle className="mr-1.5 h-3.5 w-3.5" />
            Télécharger l&apos;extension
          </a>
          <Button variant="outline" size="sm" disabled={importing} onClick={handleImportFromExtension}>
            {importing ? (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            ) : (
              <Download className="mr-1.5 h-3.5 w-3.5" />
            )}
            Importer depuis l&apos;extension
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={expiredBlocks.length === 0}
            onClick={() => setConfirmCleanOpen(true)}
          >
            <BrushCleaning className="mr-1.5 h-3.5 w-3.5" />
            Clean
            {expiredBlocks.length > 0 && ` (${expiredBlocks.length})`}
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex h-40 items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
          {PROGRAMMATION_COUNTRIES.map((c) => {
            const columnBlocks = sortBlocks(blocks.filter((b) => b.country === c.value));
            return (
              <div key={c.value} className="rounded-lg border border-border/60 bg-muted/20 p-3">
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-foreground">
                    {c.label}{" "}
                    <span className="font-normal text-muted-foreground">({columnBlocks.length})</span>
                  </h2>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 rounded-md px-2 text-xs"
                    onClick={() => handleCreate(c.value)}
                  >
                    <Plus className="mr-1 h-3.5 w-3.5" />
                    Ajouter
                  </Button>
                </div>

                <div className="space-y-2">
                  {columnBlocks.length === 0 ? (
                    <p className="py-6 text-center text-xs text-muted-foreground">Aucun bloc</p>
                  ) : (
                    columnBlocks.map((block) => (
                      <BlockCard
                        key={block.id}
                        block={block}
                        editing={editingId === block.id}
                        onEdit={() => setEditingId(block.id)}
                        onCancelEdit={() => setEditingId(null)}
                        onSave={handleSave}
                        onDelete={() => handleDelete(block.id)}
                      />
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ConfirmDeleteDialog
        open={confirmCleanOpen}
        onOpenChange={setConfirmCleanOpen}
        title={`Supprimer ${expiredBlocks.length} programmation(s) passée(s) ?`}
        description={
          cleaning
            ? "Suppression en cours..."
            : "Tous les blocs dont la date de fin est déjà passée seront définitivement supprimés. Cette action est irréversible."
        }
        onConfirm={handleCleanExpired}
      />
    </div>
  );
}
