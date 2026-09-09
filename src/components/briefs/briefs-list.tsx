"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Pencil,
  Copy,
  Trash2,
  FileCode,
  Loader2,
  FileX,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Layers,
} from "lucide-react";
import { useDevMode } from "@/lib/dev-mode";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import type { Brief, BriefStatus, Locale } from "@/types";
import { LOCALES } from "@/types";
import { DuplicateDialog } from "./duplicate-dialog";
import { StatusBadge } from "./status-badge";

// Nombre de briefs affichés au départ, et pas à pas via "Charger plus".
const PAGE_SIZE = 10;

type SortColumn = "slug" | "week" | "locale" | "status" | "createdAt";
type SortDirection = "asc" | "desc" | null;

export function BriefsList() {
  const router = useRouter();
  const devMode = useDevMode();
  const [briefs, setBriefs] = useState<Brief[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterLocale, setFilterLocale] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [duplicating, setDuplicating] = useState<Brief | null>(null);
  const [sortColumn, setSortColumn] = useState<SortColumn>("createdAt");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  // Seul l'AFFICHAGE est plafonné : recherche, filtres et tri travaillent sur
  // la liste complète, chargée en une fois. Une ligne de brief ne pèse que ses
  // métadonnées (~200 octets), donc tout charger reste négligeable — et c'est
  // ce qui garantit que la recherche porte bien sur tous les briefs.
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const toggleSelected = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSort = useCallback((column: SortColumn) => {
    setSortColumn((prev) => {
      if (prev !== column) {
        setSortDirection("asc");
        return column;
      }
      setSortDirection((dir) =>
        dir === "asc" ? "desc" : dir === "desc" ? null : "asc"
      );
      return column;
    });
  }, []);

  const filteredBriefs = useMemo(() => {
    const q = search.trim().toLowerCase();
    return briefs.filter((b) => {
      if (filterLocale !== "all" && b.locale !== filterLocale) return false;
      if (filterStatus !== "all" && b.status !== filterStatus) return false;
      if (!q) return true;
      return `${b.name ?? ""} ${b.slug}`.toLowerCase().includes(q);
    });
  }, [briefs, filterLocale, filterStatus, search]);

  const sortedBriefs = useMemo(() => {
    if (!sortDirection) return filteredBriefs;

    return [...filteredBriefs].sort((a, b) => {
      let cmp = 0;
      switch (sortColumn) {
        case "slug":
          cmp = (a.name || a.slug).localeCompare(b.name || b.slug);
          break;
        case "week":
          cmp = a.week - b.week;
          break;
        case "locale":
          cmp = a.locale.localeCompare(b.locale);
          break;
        case "status":
          cmp = a.status.localeCompare(b.status);
          break;
        case "createdAt":
          cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
      }
      return sortDirection === "desc" ? -cmp : cmp;
    });
  }, [filteredBriefs, sortColumn, sortDirection]);

  const visibleBriefs = sortedBriefs.slice(0, visibleCount);
  const remaining = sortedBriefs.length - visibleBriefs.length;

  // Un seul chargement : filtres, recherche et tri se font ensuite en mémoire,
  // ce qui les rend instantanés et garantit qu'ils couvrent tous les briefs.
  // Pure I/O, sans setState : c'est ce qui permet de l'appeler depuis un effet
  // sans déclencher de rendu en cascade.
  const loadBriefs = (): Promise<Brief[]> =>
    fetch("/api/briefs").then((r) => r.json());

  /** Rechargement après une action (suppression, duplication) : avec spinner. */
  const fetchBriefs = async () => {
    setLoading(true);
    setBriefs(await loadBriefs());
    setLoading(false);
  };

  useEffect(() => {
    loadBriefs().then((data) => {
      setBriefs(data);
      setLoading(false);
    });
  }, []);

  // Repartir du haut dès que la liste affichée change de contenu, sinon on
  // garderait un "Charger plus" déjà déroulé sur une sélection sans rapport.
  // Ajusté pendant le rendu plutôt que dans un effet (pattern React pour
  // réinitialiser un état en réponse au changement d'une prop/valeur).
  const listKey = `${filterLocale}|${filterStatus}|${search}|${sortColumn}|${sortDirection}`;
  const [prevListKey, setPrevListKey] = useState(listKey);
  if (listKey !== prevListKey) {
    setPrevListKey(listKey);
    setVisibleCount(PAGE_SIZE);
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Supprimer ce brief ?")) return;
    await fetch(`/api/briefs/${id}`, { method: "DELETE" });
    toast.success("Brief supprimé");
    fetchBriefs();
  };

  const handleDuplicate = async (
    id: string,
    targetLocale: Locale,
    targetWeek: number,
    translate: boolean,
    name: string,
  ) => {
    const res = await fetch(`/api/briefs/${id}/duplicate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetLocale, targetWeek, translate, name }),
    });
    if (res.ok) {
      const data = await res.json();
      const stats = data.translation;
      if (stats) {
        const toReview = stats.missing + stats.ambiguous;
        if (toReview > 0) {
          toast.warning(
            `Brief dupliqué — ${stats.translated} texte(s) traduit(s), ${toReview} à vérifier (marqués en rouge dans l'éditeur)`,
            { duration: 8000 },
          );
        } else {
          toast.success(
            `Brief dupliqué — ${stats.translated} texte(s) traduit(s)`,
          );
        }
      } else {
        toast.success("Brief dupliqué");
      }
      fetchBriefs();
    } else {
      const err = await res.json();
      toast.error(err.error || "Erreur lors de la duplication");
    }
    setDuplicating(null);
  };

  return (
    <>
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <Input
          placeholder="Rechercher un brief (nom ou slug)…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-72"
        />

        <Select
          value={filterLocale}
          items={{
            all: "Toutes les langues",
            ...Object.fromEntries(LOCALES.map((l) => [l.value, l.label])),
          }}
          onValueChange={(v) => setFilterLocale(v ?? "all")}
        >
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Langue" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes les langues</SelectItem>
            {LOCALES.map((l) => (
              <SelectItem key={l.value} value={l.value}>
                {l.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filterStatus}
          items={{
            all: "Tous les statuts",
            draft: "Brouillon",
            published: "Publié",
            treated: "Traité",
          }}
          onValueChange={(v) => setFilterStatus(v ?? "all")}
        >
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Statut" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les statuts</SelectItem>
            <SelectItem value="draft">Brouillon</SelectItem>
            <SelectItem value="published">Publié</SelectItem>
            <SelectItem value="treated">Traité</SelectItem>
          </SelectContent>
        </Select>

        {devMode && selected.size >= 2 && (
          <Button
            className="ml-auto rounded-lg"
            onClick={() => router.push(`/export-groupe?briefs=${[...selected].join(",")}`)}
          >
            <Layers className="mr-1.5 h-3.5 w-3.5" />
            Exporter en groupe ({selected.size})
          </Button>
        )}
      </div>

      <div className="overflow-hidden rounded-lg border border-border/60 bg-card shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              {devMode && (
                <TableHead className="w-10">
                  <input
                    type="checkbox"
                    checked={sortedBriefs.length > 0 && selected.size === sortedBriefs.length}
                    onChange={(e) =>
                      setSelected(e.target.checked ? new Set(sortedBriefs.map((b) => b.id)) : new Set())
                    }
                    className="h-3.5 w-3.5 cursor-pointer"
                  />
                </TableHead>
              )}
              {([
                ["slug", "Slug"],
                ["week", "Semaine"],
                ["locale", "Langue"],
                ["status", "Statut"],
                ["createdAt", "Créé le"],
              ] as const).map(([key, label]) => (
                <TableHead
                  key={key}
                  className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70 cursor-pointer select-none hover:text-foreground transition-colors"
                  onClick={() => toggleSort(key)}
                >
                  <div className="flex items-center gap-1">
                    {label}
                    {sortColumn === key && sortDirection === "asc" ? (
                      <ArrowUp className="h-3 w-3" />
                    ) : sortColumn === key && sortDirection === "desc" ? (
                      <ArrowDown className="h-3 w-3" />
                    ) : (
                      <ArrowUpDown className="h-3 w-3 opacity-30" />
                    )}
                  </div>
                </TableHead>
              ))}
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={devMode ? 7 : 6} className="py-16 text-center">
                  <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" />
                </TableCell>
              </TableRow>
            ) : sortedBriefs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={devMode ? 7 : 6} className="py-16 text-center">
                  <FileX className="mx-auto mb-2 h-8 w-8 text-muted-foreground/40" />
                  <p className="text-sm text-muted-foreground">Aucun brief trouvé</p>
                </TableCell>
              </TableRow>
            ) : (
              visibleBriefs.map((brief) => (
                <TableRow key={brief.id} className="group">
                  {devMode && (
                    <TableCell>
                      <input
                        type="checkbox"
                        checked={selected.has(brief.id)}
                        onChange={() => toggleSelected(brief.id)}
                        className="h-3.5 w-3.5 cursor-pointer"
                      />
                    </TableCell>
                  )}
                  <TableCell>
                    <Link
                      href={`/briefs/${brief.id}`}
                      className="font-semibold text-foreground hover:text-primary transition-colors"
                    >
                      {brief.name || brief.slug}
                    </Link>
                    {brief.name && (
                      <span className="font-light ml-2 text-xs text-muted-foreground">{brief.slug}</span>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground tabular-nums">
                    S{String(brief.week).padStart(2, "0")}
                  </TableCell>
                  <TableCell>
                    <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-medium uppercase">
                      {brief.locale}
                    </span>
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={brief.status as BriefStatus} />
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground tabular-nums">
                    {new Date(brief.createdAt).toLocaleDateString("fr-FR")}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Link href={`/briefs/${brief.id}`}>
                        <Button variant="ghost" size="icon" className="h-7 w-7" title="Éditer">
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                      </Link>
                      <Link href={`/briefs/${brief.id}/export`}>
                        <Button variant="ghost" size="icon" className="h-7 w-7" title="Exporter">
                          <FileCode className="h-3.5 w-3.5" />
                        </Button>
                      </Link>
                      <Button variant="ghost" size="icon" className="h-7 w-7" title="Dupliquer" onClick={() => setDuplicating(brief)}>
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" title="Supprimer" onClick={() => handleDelete(brief.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {remaining > 0 && (
        <div className="mt-4 flex items-center justify-center gap-3">
          <Button
            variant="outline"
            onClick={() => setVisibleCount((n) => n + PAGE_SIZE)}
          >
            Charger plus
          </Button>
          <span className="text-xs text-muted-foreground">
            {visibleBriefs.length} sur {sortedBriefs.length} brief
            {sortedBriefs.length > 1 ? "s" : ""}
          </span>
        </div>
      )}

      {duplicating && (
        <DuplicateDialog
          brief={duplicating}
          onDuplicate={(locale, week, translate, name) =>
            handleDuplicate(duplicating.id, locale, week, translate, name)
          }
          onClose={() => setDuplicating(null)}
        />
      )}
    </>
  );
}
