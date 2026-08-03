"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Download,
  Languages,
  Loader2,
  Plus,
  Save,
  Search,
  Trash2,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import { LOCALES, type Locale } from "@/types";

interface EditableRow {
  // null tant que la ligne n'a pas été sauvegardée en base
  id: string | null;
  key: string;
  values: Partial<Record<Locale, string>>;
}

export default function TranslationsPage() {
  const [rows, setRows] = useState<EditableRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [search, setSearch] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchRows = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/translations");
    if (!res.ok) {
      setLoading(false);
      toast.error("Impossible de charger les traductions");
      return;
    }
    const data = await res.json();
    setRows(
      data.map((entry: { id: string; key: string; values: Partial<Record<Locale, string>> }) => ({
        id: entry.id,
        key: entry.key,
        values: entry.values ?? {},
      })),
    );
    setDirty(false);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchRows();
  }, [fetchRows]);

  // Protection contre la perte de modifications non sauvegardées
  useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  const handleSave = useCallback(async () => {
    const cleaned = rows.filter((row) => row.key.trim());
    if (cleaned.length < rows.length) {
      toast.error("Certaines lignes n'ont pas de clé — renseignez-les ou supprimez-les");
      return;
    }
    const keys = cleaned.map((row) => row.key.trim().toLowerCase());
    const duplicate = keys.find((key, i) => keys.indexOf(key) !== i);
    if (duplicate) {
      toast.error(`Clé en double : "${duplicate}"`);
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/translations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entries: cleaned.map((row) => ({ key: row.key, values: row.values })),
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        toast.error(data?.error ?? "Erreur lors de la sauvegarde");
        return;
      }
      const data = await res.json();
      toast.success(`${data.saved} traduction(s) sauvegardée(s)`);
      await fetchRows();
    } finally {
      setSaving(false);
    }
  }, [rows, fetchRows]);

  // Ctrl+S pour sauvegarder (même convention que l'éditeur de brief)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        if (dirty && !saving) handleSave();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [dirty, saving, handleSave]);

  const updateRow = (index: number, patch: Partial<EditableRow>) => {
    setRows((prev) =>
      prev.map((row, i) => (i === index ? { ...row, ...patch } : row)),
    );
    setDirty(true);
  };

  const updateValue = (index: number, locale: Locale, value: string) => {
    setRows((prev) =>
      prev.map((row, i) =>
        i === index
          ? { ...row, values: { ...row.values, [locale]: value } }
          : row,
      ),
    );
    setDirty(true);
  };

  const addRow = () => {
    setRows((prev) => [{ id: null, key: "", values: {} }, ...prev]);
    setDirty(true);
  };

  const deleteRow = async (index: number) => {
    const row = rows[index];
    if (row.id) {
      if (!confirm(`Supprimer la clé "${row.key}" ?`)) return;
      const res = await fetch(`/api/translations?id=${row.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        toast.error("Erreur lors de la suppression");
        return;
      }
      toast.success("Clé supprimée");
    }
    setRows((prev) => prev.filter((_, i) => i !== index));
  };

  const handleImportFile = async (file: File) => {
    const format = file.name.toLowerCase().endsWith(".csv")
      ? "csv"
      : file.name.toLowerCase().endsWith(".json")
        ? "json"
        : null;
    if (!format) {
      toast.error("Fichier .csv ou .json attendu");
      return;
    }

    setImporting(true);
    try {
      const content = await file.text();
      const res = await fetch("/api/translations/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, format }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        toast.error(data?.error ?? "Erreur lors de l'import");
        return;
      }
      toast.success(`${data.imported} traduction(s) importée(s)`);
      await fetchRows();
    } finally {
      setImporting(false);
    }
  };

  const query = search.trim().toLowerCase();
  const visibleRows = rows
    .map((row, index) => ({ row, index }))
    .filter(({ row }) => {
      if (!query) return true;
      if (row.key.toLowerCase().includes(query)) return true;
      return Object.values(row.values).some((v) =>
        v?.toLowerCase().includes(query),
      );
    });

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-8 flex items-end justify-between flex-wrap gap-4">
        <div>
          <h1 className="flex items-center gap-2.5 text-2xl font-bold tracking-tight text-foreground">
            <Languages className="h-6 w-6 text-primary" />
            Traduction
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Glossaire global : une clé, une valeur par langue
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.json"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleImportFile(file);
              e.target.value = "";
            }}
          />
          <Button
            variant="outline"
            disabled={importing}
            onClick={() => fileInputRef.current?.click()}
          >
            {importing ? (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
            ) : (
              <Upload className="mr-1.5 h-4 w-4" />
            )}
            Importer
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              window.location.href = "/api/translations/export?format=json";
            }}
          >
            <Download className="mr-1.5 h-4 w-4" />
            JSON
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              window.location.href = "/api/translations/export?format=csv";
            }}
          >
            <Download className="mr-1.5 h-4 w-4" />
            CSV
          </Button>
          <Button variant="outline" onClick={addRow}>
            <Plus className="mr-1.5 h-4 w-4" />
            Ajouter une clé
          </Button>
          <Button
            onClick={handleSave}
            disabled={!dirty || saving}
            className="shadow-sm shadow-primary/20"
          >
            {saving ? (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-1.5 h-4 w-4" />
            )}
            Enregistrer
          </Button>
        </div>
      </div>

      <div className="mb-6 max-w-md">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/50" />
          <Input
            placeholder="Rechercher une clé ou une valeur..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-10 pl-9"
          />
        </div>
      </div>

      {loading ? (
        <div className="py-16 text-center text-sm text-muted-foreground">
          Chargement...
        </div>
      ) : rows.length === 0 ? (
        <div className="py-16 text-center">
          <Languages className="mx-auto mb-3 h-10 w-10 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">
            Aucune traduction pour le moment
          </p>
          <Button variant="link" className="mt-2" onClick={addRow}>
            Ajouter votre première clé
          </Button>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border/60 bg-card shadow-sm">
          <table className="w-full min-w-225 text-sm">
            <thead>
              <tr className="border-b border-border/60 bg-muted/40 text-left">
                <th className="w-55 px-3 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Clé
                </th>
                {LOCALES.map((locale) => (
                  <th
                    key={locale.value}
                    className="px-3 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                  >
                    {locale.label}
                  </th>
                ))}
                <th className="w-13 px-3 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {visibleRows.map(({ row, index }) => (
                <tr
                  key={row.id ?? `new-${index}`}
                  className="border-b border-border/40 last:border-0 hover:bg-muted/20"
                >
                  <td className="px-3 py-1.5">
                    <Input
                      value={row.key}
                      readOnly={row.id !== null}
                      title={
                        row.id !== null
                          ? "Clé non renommable — supprimez puis recréez si besoin"
                          : undefined
                      }
                      placeholder="ex: cta.decouvrir"
                      onChange={(e) => updateRow(index, { key: e.target.value })}
                      className={
                        row.id !== null
                          ? "h-8 border-transparent bg-transparent font-mono text-xs shadow-none focus-visible:ring-0"
                          : "h-8 font-mono text-xs"
                      }
                    />
                  </td>
                  {LOCALES.map((locale) => (
                    <td key={locale.value} className="px-3 py-1.5">
                      <Input
                        value={row.values[locale.value] ?? ""}
                        placeholder="—"
                        onChange={(e) =>
                          updateValue(index, locale.value, e.target.value)
                        }
                        className="h-8 text-xs"
                      />
                    </td>
                  ))}
                  <td className="px-3 py-1.5 text-center">
                    <button
                      type="button"
                      onClick={() => deleteRow(index)}
                      title="Supprimer"
                      className="rounded-md p-1.5 text-muted-foreground/50 transition-colors hover:bg-red-50 hover:text-red-600"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
              {visibleRows.length === 0 && (
                <tr>
                  <td
                    colSpan={LOCALES.length + 2}
                    className="px-3 py-8 text-center text-sm text-muted-foreground"
                  >
                    Aucun résultat pour « {search} »
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {dirty && (
        <p className="mt-3 text-xs text-amber-600">
          Modifications non sauvegardées — pensez à enregistrer (Ctrl+S)
        </p>
      )}
    </div>
  );
}
