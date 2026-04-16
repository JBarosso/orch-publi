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
import type { Brief, Locale } from "@/types";
import { LOCALES } from "@/types";

interface DuplicateDialogProps {
  brief: Brief;
  onDuplicate: (locale: Locale, week: number) => void;
  onClose: () => void;
}

export function DuplicateDialog({
  brief,
  onDuplicate,
  onClose,
}: DuplicateDialogProps) {
  const [targetLocale, setTargetLocale] = useState<Locale>(brief.locale);
  const [targetWeek, setTargetWeek] = useState<number>(brief.week);

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Dupliquer le brief</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Dupliquer <strong>{brief.slug}</strong>
        </p>
        <div className="flex gap-4">
          <div className="flex-1 space-y-2">
            <Label>Langue</Label>
            <Select
              value={targetLocale}
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
            <Input
              type="number"
              value={targetWeek}
              onChange={(e) => setTargetWeek(Number(e.target.value))}
              min={1}
              max={53}
              className="w-full"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button
            onClick={() => onDuplicate(targetLocale, targetWeek)}
          >
            Dupliquer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
