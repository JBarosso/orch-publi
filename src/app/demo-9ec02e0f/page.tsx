"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { v4 as uuidv4 } from "uuid";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ConfirmDeleteDialog } from "@/components/editor/confirm-delete-dialog";
import { WeekInput } from "@/components/week-input";
import { LOCALES, type Locale } from "@/types";
import { getCurrentWeek } from "@/lib/utils";
import { DEMO_BASE } from "./_demo/config";
import { DemoLoading } from "./_demo/states";
import { DEMO_SECTION_LABELS, briefLabel, updateDemoBriefs, useDemoBriefs } from "./_demo/store";

export default function DemoDashboardPage() {
  const router = useRouter();
  const briefs = useDemoBriefs();
  const [createOpen, setCreateOpen] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [year, setYear] = useState(() => new Date().getFullYear());
  const [week, setWeek] = useState(getCurrentWeek);
  const [locale, setLocale] = useState<Locale>("FR");

  const createBrief = () => {
    const id = uuidv4();
    updateDemoBriefs((all) => [{ id, name: name.trim(), year, week, locale, sections: [] }, ...all]);
    setCreateOpen(false);
    setName("");
    router.push(`${DEMO_BASE}/briefs/${id}`);
  };

  if (!briefs) return <DemoLoading />;

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">Gérez vos briefs hebdomadaires par langue</p>
        </div>
        <Button className="shadow-sm shadow-primary/20" onClick={() => setCreateOpen(true)}>
          <Plus className="mr-1.5 h-4 w-4" />
          Nouveau brief
        </Button>
      </div>

      {briefs.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
          Aucun brief. Cliquez sur « Nouveau brief » pour commencer.
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-border/60 bg-card shadow-sm">
          <table className="w-full text-sm">
            <thead className="border-b border-border/60 bg-muted/30 text-left text-xs text-muted-foreground">
              <tr>
                <th className="px-4 py-2.5 font-medium">Brief</th>
                <th className="px-4 py-2.5 font-medium">Semaine</th>
                <th className="px-4 py-2.5 font-medium">Langue</th>
                <th className="px-4 py-2.5 font-medium">Sections</th>
                <th className="w-12" />
              </tr>
            </thead>
            <tbody>
              {briefs.map((brief) => (
                <tr key={brief.id} className="border-b border-border/40 last:border-0 hover:bg-muted/30">
                  <td className="px-4 py-3">
                    <Link href={`${DEMO_BASE}/briefs/${brief.id}`} className="font-medium hover:underline">
                      {briefLabel(brief)}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {brief.year} · S{String(brief.week).padStart(2, "0")}
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded-md bg-muted px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground">
                      {brief.locale}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {brief.sections.map((section) => DEMO_SECTION_LABELS[section.type]).join(", ") || "—"}
                  </td>
                  <td className="px-2 py-3 text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      title="Supprimer le brief"
                      className="h-7 w-7 text-muted-foreground/60 hover:text-destructive"
                      onClick={() => setPendingDeleteId(brief.id)}
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

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Nouveau brief</DialogTitle>
          </DialogHeader>
          <div className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="demo-name" className="text-xs font-medium">
                Nom du brief (optionnel)
              </Label>
              <Input
                id="demo-name"
                placeholder="ex: Rentrée scolaire"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-10"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="demo-year" className="text-xs font-medium">
                  Année
                </Label>
                <Input
                  id="demo-year"
                  type="number"
                  value={year}
                  onChange={(e) => setYear(Number(e.target.value))}
                  min={2024}
                  max={2030}
                  className="h-10"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="demo-week" className="text-xs font-medium">
                  Semaine
                </Label>
                <WeekInput id="demo-week" value={week} onChange={setWeek} year={year} className="h-10" />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-medium">Langue</Label>
              <Select
                value={locale}
                items={Object.fromEntries(LOCALES.map((l) => [l.value, l.label]))}
                onValueChange={(v) => v && setLocale(v as Locale)}
              >
                <SelectTrigger className="h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LOCALES.map((l) => (
                    <SelectItem key={l.value} value={l.value}>
                      {l.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Annuler
            </Button>
            <Button onClick={createBrief}>Créer le brief</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDeleteDialog
        open={!!pendingDeleteId}
        onOpenChange={(open) => !open && setPendingDeleteId(null)}
        title="Supprimer ce brief ?"
        description="Cette action est irréversible. Le brief et ses sections seront supprimés."
        onConfirm={() => {
          const id = pendingDeleteId;
          updateDemoBriefs((all) => all.filter((brief) => brief.id !== id));
          setPendingDeleteId(null);
        }}
      />
    </div>
  );
}
