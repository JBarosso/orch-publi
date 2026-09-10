"use client";

import { useState } from "react";
import { RotateCcw, Save, Settings as SettingsIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { resetDemo } from "../_demo/store";

// Paramétrage factice : dans la vraie app ces réglages pilotent la purge des
// données, qui n'existe pas ici. Seule la réinitialisation agit réellement.
export default function DemoSettingsPage() {
  const [months, setMonths] = useState("24");
  const [autoPurge, setAutoPurge] = useState(false);

  const handleReset = () => {
    if (!confirm("Réinitialiser la démo ?\n\nLes briefs créés ou modifiés seront remplacés par les exemples.")) {
      return;
    }
    resetDemo();
    toast.success("Démo réinitialisée");
  };

  return (
    <div className="max-w-3xl p-6 lg:p-8">
      <div className="mb-8">
        <h1 className="flex items-center gap-2.5 text-2xl font-bold tracking-tight text-foreground">
          <SettingsIcon className="h-6 w-6 text-primary" />
          Paramétrage
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">Rétention des données et maintenance</p>
      </div>

      <section className="rounded-lg border border-border/60 bg-card p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-foreground">Durée de conservation</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Les briefs <strong>traités</strong> plus anciens que cette durée, et les images de la
          médiathèque non utilisées, deviennent éligibles à la purge.
        </p>
        <div className="mt-4 flex items-end gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="demo-retention-months">Durée (mois)</Label>
            <Input
              id="demo-retention-months"
              type="number"
              min={1}
              max={120}
              value={months}
              onChange={(e) => setMonths(e.target.value)}
              className="w-32"
            />
          </div>
          <Button onClick={() => toast.success("Durée de rétention enregistrée")}>
            <Save className="mr-1.5 h-4 w-4" />
            Enregistrer
          </Button>
        </div>
        <div className="mt-4 flex items-start justify-between gap-3 border-t border-border/60 pt-4">
          <div>
            <Label htmlFor="demo-auto-purge">Purge automatique chaque nuit</Label>
            <p className="mt-1 text-xs text-muted-foreground">
              Supprime les données expirées sans intervention.
            </p>
          </div>
          <Switch id="demo-auto-purge" checked={autoPurge} onCheckedChange={setAutoPurge} />
        </div>
      </section>

      <section className="mt-6 rounded-lg border border-border/60 bg-card p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-foreground">Démo</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Remet les briefs d&apos;exemple et efface ceux créés pendant une présentation.
        </p>
        <Button variant="outline" className="mt-4" onClick={handleReset}>
          <RotateCcw className="mr-1.5 h-4 w-4" />
          Réinitialiser la démo
        </Button>
      </section>
    </div>
  );
}
