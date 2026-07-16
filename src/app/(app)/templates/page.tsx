"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Archive,
  CheckCircle2,
  Loader2,
  LayoutTemplate,
  MoreHorizontal,
  Pencil,
  PencilLine,
  Plus,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { CustomTemplate, CustomTemplateStatus } from "@/types";
import { CUSTOM_LAYOUTS, TEMPLATE_STATUS_CONFIG } from "@/types";

function layoutLabel(layout: string): string {
  return CUSTOM_LAYOUTS.find((l) => l.value === layout)?.label ?? layout;
}

function TemplateStatusBadge({ status }: { status: CustomTemplateStatus }) {
  const config = TEMPLATE_STATUS_CONFIG[status] ?? TEMPLATE_STATUS_CONFIG.draft;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium",
        config.color,
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", config.dot)} />
      {config.label}
    </span>
  );
}

export default function TemplatesPage() {
  const router = useRouter();
  const [templates, setTemplates] = useState<CustomTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<CustomTemplate | null>(null);

  const fetchTemplates = useCallback(async () => {
    const res = await fetch("/api/templates");
    if (!res.ok) {
      toast.error("Impossible de charger les templates");
      setLoading(false);
      return;
    }
    setTemplates(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const handleCreate = async () => {
    if (!newName.trim()) {
      toast.error("Donnez un nom au template");
      return;
    }
    setCreating(true);
    try {
      const res = await fetch("/api/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim() }),
      });
      if (!res.ok) {
        toast.error("Erreur lors de la création");
        return;
      }
      const created: CustomTemplate = await res.json();
      router.push(`/templates/${created.id}`);
    } finally {
      setCreating(false);
    }
  };

  const changeStatus = async (id: string, status: CustomTemplateStatus) => {
    const res = await fetch("/api/templates", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    if (!res.ok) {
      toast.error("Erreur lors du changement de statut");
      return;
    }
    toast.success(
      status === "published"
        ? "Template publié — il est désormais proposé dans l'éditeur de brief"
        : status === "archived"
          ? "Template archivé"
          : "Template repassé en brouillon",
    );
    fetchTemplates();
  };

  const handleDelete = async () => {
    if (!pendingDelete) return;
    const res = await fetch("/api/templates", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: pendingDelete.id }),
    });
    if (!res.ok) {
      toast.error("Erreur lors de la suppression");
      return;
    }
    setPendingDelete(null);
    toast.success("Template supprimé");
    fetchTemplates();
  };

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2.5 text-2xl font-bold tracking-tight text-foreground">
            <LayoutTemplate className="h-6 w-6 text-primary" />
            Templates
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Sections personnalisées réutilisables. Seuls les templates publiés
            sont proposés dans l&apos;éditeur de brief.
          </p>
        </div>
        <Button onClick={() => { setNewName(""); setCreateOpen(true); }}>
          <Plus className="mr-1.5 h-4 w-4" />
          Nouveau template
        </Button>
      </div>

      {loading ? (
        <div className="flex h-40 items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : templates.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border/60 p-10 text-center text-sm text-muted-foreground">
          Aucun template. Créez-en un, ou convertissez une section
          personnalisée depuis un brief.
        </div>
      ) : (
        <div className="space-y-2">
          {templates.map((template) => (
            <div
              key={template.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-card px-4 py-3 shadow-sm"
            >
              <div className="min-w-0">
                <button
                  type="button"
                  onClick={() => router.push(`/templates/${template.id}`)}
                  className="block truncate text-sm font-semibold text-foreground hover:underline"
                >
                  {template.name}
                </button>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {layoutLabel(template.layout)} ·{" "}
                  {(template.blocks ?? []).length} bloc(s) · modifié le{" "}
                  {new Date(template.updatedAt).toLocaleDateString("fr-FR")}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <TemplateStatusBadge status={template.status} />
                <DropdownMenu>
                  <DropdownMenuTrigger className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
                    <MoreHorizontal className="h-4 w-4" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() => router.push(`/templates/${template.id}`)}
                    >
                      <Pencil className="mr-2 h-3.5 w-3.5" />
                      Éditer
                    </DropdownMenuItem>
                    {template.status !== "published" && (
                      <DropdownMenuItem
                        onClick={() => changeStatus(template.id, "published")}
                      >
                        <CheckCircle2 className="mr-2 h-3.5 w-3.5" />
                        Publier
                      </DropdownMenuItem>
                    )}
                    {template.status !== "draft" && (
                      <DropdownMenuItem
                        onClick={() => changeStatus(template.id, "draft")}
                      >
                        <PencilLine className="mr-2 h-3.5 w-3.5" />
                        Repasser en brouillon
                      </DropdownMenuItem>
                    )}
                    {template.status !== "archived" && (
                      <DropdownMenuItem
                        onClick={() => changeStatus(template.id, "archived")}
                      >
                        <Archive className="mr-2 h-3.5 w-3.5" />
                        Archiver
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onClick={() => setPendingDelete(template)}
                    >
                      <Trash2 className="mr-2 h-3.5 w-3.5" />
                      Supprimer
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Nouveau template</DialogTitle>
            <DialogDescription>
              Le template est créé en brouillon : publiez-le pour le proposer
              dans l&apos;éditeur de brief.
            </DialogDescription>
          </DialogHeader>
          <Input
            placeholder="Nom du template"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            autoFocus
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleCreate} disabled={creating}>
              {creating && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
              Créer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!pendingDelete} onOpenChange={() => setPendingDelete(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Supprimer « {pendingDelete?.name} » ?</DialogTitle>
            <DialogDescription>
              Cette action est irréversible. Les sections déjà créées depuis ce
              template ne sont pas affectées.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPendingDelete(null)}>
              Annuler
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Supprimer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
