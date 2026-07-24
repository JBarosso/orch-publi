"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { WeekInput } from "@/components/week-input";
import type { Brief, Locale } from "@/types";
import { LOCALES } from "@/types";

interface DuplicateDialogProps {
  brief: Brief;
  onDuplicate: (locale: Locale, week: number, translate: boolean, name: string) => void;
  onClose: () => void;
}

export function DuplicateDialog({
  brief,
  onDuplicate,
  onClose,
}: DuplicateDialogProps) {
  // Normalisation : les briefs historiques stockent la locale en minuscules ("fr")
  const [targetLocale, setTargetLocale] = useState<Locale>(
    brief.locale.toUpperCase() as Locale,
  );
  const [targetWeek, setTargetWeek] = useState<number>(brief.week);
  const [translate, setTranslate] = useState(false);
  // Par défaut, garde le nom du brief source — personnalisable ici.
  const [name, setName] = useState(brief.name || "");

  const localeChanged =
    targetLocale.toUpperCase() !== brief.locale.toUpperCase();

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Dupliquer le brief</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Dupliquer <strong>{brief.name || brief.slug}</strong>
        </p>
        <div className="space-y-2">
          <Label>Nom du brief (optionnel)</Label>
          <Input
            placeholder="ex: Rentrée scolaire"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full"
          />
        </div>
        <div className="flex gap-4">
          <div className="flex-1 space-y-2">
            <Label>Langue</Label>
            <Select
              value={targetLocale}
              items={Object.fromEntries(LOCALES.map((l) => [l.value, l.label]))}
              onValueChange={(v) => v && setTargetLocale(v as Locale)}
            >
              <SelectTrigger className="w-full">
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
          <div className="flex-1 space-y-2">
            <Label>Semaine</Label>
            <WeekInput value={targetWeek} onChange={setTargetWeek} year={brief.year} className="w-full" />
          </div>
        </div>
        {localeChanged && (
          <div className="flex items-start justify-between gap-3 rounded-lg border border-border/60 bg-muted/30 p-3">
            <div className="space-y-0.5">
              <Label htmlFor="translate-switch" className="cursor-pointer">
                Traduire vers la langue de destination
              </Label>
              <p className="text-xs text-muted-foreground">
                Les textes reconnus dans le glossaire ({brief.locale} →{" "}
                {targetLocale}) seront remplacés. Les autres resteront en{" "}
                {brief.locale} et seront marqués à vérifier.
              </p>
            </div>
            <Switch
              id="translate-switch"
              checked={translate}
              onCheckedChange={setTranslate}
            />
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button
            onClick={() =>
              onDuplicate(targetLocale, targetWeek, localeChanged && translate, name)
            }
          >
            Dupliquer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
