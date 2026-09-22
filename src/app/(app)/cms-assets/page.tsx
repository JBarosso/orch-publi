"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Database, Loader2, Plus, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CMS_ASSET_SECTION_TYPES, cmsAssetColumnLabel, defaultCmsPage } from "@/lib/cms-asset";
import type { CmsPage, SectionType } from "@/types";

interface EditableRow {
  // null tant que la page n'a pas été enregistrée en base
  id: string | null;
  name: string;
  assets: Partial<Record<SectionType, string>>;
  isDefault: boolean;
  dirty: boolean;
}

export default function CmsAssetsPage() {
  const [rows, setRows] = useState<EditableRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const dirty = rows.some((r) => r.dirty);

  const fetchRows = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/cms-pages");
    if (!res.ok) {
      toast.error("Impossible de charger les pages");
      setLoading(false);
      return;
    }
    const data: CmsPage[] = await res.json();
    setRows(
      data.map((p) => ({ id: p.id, name: p.name, assets: p.assets ?? {}, isDefault: p.isDefault ?? false, dirty: false })),
    );
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchRows();
  }, [fetchRows]);

  // Protection contre la perte de modifications non sauvegardées
  useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  const updateRow = (index: number, patch: Partial<EditableRow>) => {
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, ...patch, dirty: true } : r)));
  };

  const addRow = () =>
    setRows((prev) => [...prev, { id: null, name: "", assets: {}, isDefault: false, dirty: true }]);

  // Une seule page par défaut : cocher l'une décoche les autres.
  const setDefaultRow = (index: number) =>
    setRows((prev) =>
      prev.map((r, i) => (i === index || r.isDefault ? { ...r, isDefault: i === index, dirty: true } : r)),
    );
  // Page par défaut effective, y compris celle reconnue à son nom tant
  // qu'aucune n'est cochée explicitement (même règle que dans les briefs).
  const defaultIndex = Number(
    defaultCmsPage(rows.map((r, i) => ({ id: String(i), name: r.name, assets: r.assets, isDefault: r.isDefault })))
      ?.id ?? -1,
  );

  const deleteRow = async (index: number) => {
    const row = rows[index];
    if (row.id) {
      if (
        !confirm(
          `Supprimer la page « ${row.name} » ?\n\nLes sections qui la visaient n'auront plus d'asset déduit (leurs saisies manuelles sont conservées).`,
        )
      ) {
        return;
      }
      const res = await fetch(`/api/cms-pages?id=${row.id}`, { method: "DELETE" });
      if (!res.ok) {
        toast.error("Erreur lors de la suppression");
        return;
      }
      toast.success("Page supprimée");
    }
    setRows((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    const toSave = rows.filter((r) => r.dirty);
    if (toSave.some((r) => !r.name.trim())) {
      toast.error("Chaque page doit avoir un nom");
      return;
    }
    setSaving(true);
    try {
      const results = await Promise.all(
        toSave.map((row) =>
          fetch("/api/cms-pages", {
            method: row.id ? "PUT" : "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: row.id, name: row.name, assets: row.assets, isDefault: row.isDefault }),
          }),
        ),
      );
      if (results.some((r) => !r.ok)) {
        toast.error("Certaines pages n'ont pas pu être enregistrées");
        return;
      }
      toast.success("Assets CMS enregistrés");
      await fetchRows();
    } finally {
      setSaving(false);
    }
  };

  // Ctrl+S / Cmd+S, comme dans les briefs. Toujours intercepté (sinon le
  // navigateur ouvre « Enregistrer la page sous »), mais n'enregistre que s'il
  // y a quelque chose à enregistrer. La ref évite de réabonner l'écouteur à
  // chaque frappe tout en appelant la version à jour de handleSave.
  const saveShortcutRef = useRef<() => void>(() => {});
  useEffect(() => {
    saveShortcutRef.current = () => {
      if (dirty && !saving) handleSave();
    };
  });
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        saveShortcutRef.current();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2.5 text-2xl font-bold tracking-tight text-foreground">
            <Database className="h-6 w-6 text-primary" />
            Assets CMS
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Une ligne par page du site, et pour chaque type de section l&apos;identifiant de
            l&apos;asset Salesforce où coller son code. Dans un brief, chaque section choisit sa
            page : l&apos;asset est alors indiqué à l&apos;export. Commun à toutes les langues.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={addRow}>
            <Plus className="mr-1.5 h-4 w-4" />
            Ajouter une page
          </Button>
          <Button
            onClick={handleSave}
            disabled={!dirty || saving}
            title="Enregistrer (Ctrl+S)"
            className="shadow-sm shadow-primary/20"
          >
            {saving ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Save className="mr-1.5 h-4 w-4" />}
            Enregistrer
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="py-16 text-center text-sm text-muted-foreground">Chargement...</div>
      ) : rows.length === 0 ? (
        <div className="py-16 text-center">
          <Database className="mx-auto mb-3 h-10 w-10 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">Aucune page pour le moment</p>
          <Button variant="link" className="mt-2" onClick={addRow}>
            Ajouter votre première page
          </Button>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border/60 bg-card shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/60 bg-muted/40 text-left">
                <th className="sticky left-0 z-10 min-w-48 bg-muted/40 px-3 py-2.5 text-xs font-semibold text-muted-foreground">
                  Page
                </th>
                <th
                  className="px-2 py-2.5 text-xs font-semibold text-muted-foreground"
                  title="Page utilisée par les sections d'un brief qui n'en ont pas choisi"
                >
                  Défaut
                </th>
                {CMS_ASSET_SECTION_TYPES.map((type) => (
                  <th key={type} className="min-w-40 px-3 py-2.5 text-xs font-semibold text-muted-foreground">
                    {cmsAssetColumnLabel(type)}
                  </th>
                ))}
                <th className="w-10" />
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={row.id ?? `new-${index}`} className="border-b border-border/40 last:border-0">
                  <td className="sticky left-0 z-10 bg-card px-3 py-1.5">
                    <Input
                      placeholder="ex : HP cat bébé"
                      value={row.name}
                      onChange={(e) => updateRow(index, { name: e.target.value })}
                      className="h-8 text-sm font-medium"
                    />
                  </td>
                  <td className="px-2 py-1.5 text-center">
                    <input
                      type="radio"
                      name="default-cms-page"
                      checked={index === defaultIndex}
                      onChange={() => setDefaultRow(index)}
                      aria-label={`Page par défaut : ${row.name || "sans nom"}`}
                      className="h-4 w-4 accent-primary"
                    />
                  </td>
                  {CMS_ASSET_SECTION_TYPES.map((type) => (
                    <td key={type} className="px-3 py-1.5">
                      <Input
                        placeholder="—"
                        value={row.assets[type] ?? ""}
                        onChange={(e) => updateRow(index, { assets: { ...row.assets, [type]: e.target.value } })}
                        className="h-8 font-mono text-xs"
                      />
                    </td>
                  ))}
                  <td className="px-2 py-1.5">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteRow(index)}
                      className="h-8 w-8 text-muted-foreground/50 hover:text-destructive"
                      title="Supprimer la page"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
