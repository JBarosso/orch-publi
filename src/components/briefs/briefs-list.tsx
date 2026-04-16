"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import Link from "next/link";
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
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

type SortColumn = "slug" | "week" | "locale" | "status" | "createdAt";
type SortDirection = "asc" | "desc" | null;

export function BriefsList() {
  const [briefs, setBriefs] = useState<Brief[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterLocale, setFilterLocale] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [duplicating, setDuplicating] = useState<Brief | null>(null);
  const [sortColumn, setSortColumn] = useState<SortColumn>("createdAt");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

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

  const sortedBriefs = useMemo(() => {
    if (!sortDirection) return briefs;

    return [...briefs].sort((a, b) => {
      let cmp = 0;
      switch (sortColumn) {
        case "slug":
          cmp = a.slug.localeCompare(b.slug);
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
  }, [briefs, sortColumn, sortDirection]);

  const fetchBriefs = async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filterLocale !== "all") params.set("locale", filterLocale);
    if (filterStatus !== "all") params.set("status", filterStatus);
    const res = await fetch(`/api/briefs?${params}`);
    const data = await res.json();
    setBriefs(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchBriefs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterLocale, filterStatus]);

  const handleDelete = async (id: string) => {
    if (!confirm("Supprimer ce brief ?")) return;
    await fetch(`/api/briefs/${id}`, { method: "DELETE" });
    toast.success("Brief supprimé");
    fetchBriefs();
  };

  const handleDuplicate = async (id: string, targetLocale: Locale, targetWeek: number) => {
    const res = await fetch(`/api/briefs/${id}/duplicate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetLocale, targetWeek }),
    });
    if (res.ok) {
      toast.success("Brief dupliqué");
      fetchBriefs();
    } else {
      const err = await res.json();
      toast.error(err.error || "Erreur lors de la duplication");
    }
    setDuplicating(null);
  };

  return (
    <>
      <div className="mb-5 flex gap-3">
        <Select value={filterLocale} onValueChange={(v) => setFilterLocale(v ?? "all")}>
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

        <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v ?? "all")}>
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
      </div>

      <div className="overflow-hidden rounded-lg border border-border/60 bg-card shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
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
                <TableCell colSpan={6} className="py-16 text-center">
                  <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" />
                </TableCell>
              </TableRow>
            ) : briefs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-16 text-center">
                  <FileX className="mx-auto mb-2 h-8 w-8 text-muted-foreground/40" />
                  <p className="text-sm text-muted-foreground">Aucun brief trouvé</p>
                </TableCell>
              </TableRow>
            ) : (
              sortedBriefs.map((brief) => (
                <TableRow key={brief.id} className="group">
                  <TableCell>
                    <Link
                      href={`/briefs/${brief.id}`}
                      className="font-medium text-foreground hover:text-primary transition-colors"
                    >
                      {brief.slug}
                    </Link>
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

      {duplicating && (
        <DuplicateDialog
          brief={duplicating}
          onDuplicate={(locale, week) => handleDuplicate(duplicating.id, locale, week)}
          onClose={() => setDuplicating(null)}
        />
      )}
    </>
  );
}
