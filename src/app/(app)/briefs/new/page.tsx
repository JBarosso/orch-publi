"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { LOCALES, type Locale } from "@/types";
import { getCurrentWeek } from "@/lib/utils";

export default function NewBriefPage() {
  const router = useRouter();
  const currentYear = new Date().getFullYear();
  const currentWeek = getCurrentWeek();

  const [year, setYear] = useState(currentYear);
  const [week, setWeek] = useState(currentWeek);
  const [locale, setLocale] = useState<Locale>("fr");
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/briefs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ year, week, locale }),
      });

      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error || "Erreur lors de la création");
        return;
      }

      const brief = await res.json();
      toast.success(`Brief ${brief.slug} créé`);
      router.push(`/briefs/${brief.id}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-8 flex items-center gap-3">
        <Link href="/">
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="text-lg font-semibold">Nouveau brief</h1>
      </div>

      <div className="mx-auto max-w-md">
        <div className="rounded-lg border border-border/60 bg-card p-6 shadow-sm">
          <h2 className="mb-5 text-sm font-semibold">Informations du brief</h2>

          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="year" className="text-xs font-medium">
                  Année
                </Label>
                <Input
                  id="year"
                  type="number"
                  value={year}
                  onChange={(e) => setYear(Number(e.target.value))}
                  min={2024}
                  max={2030}
                  className="h-10"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="week" className="text-xs font-medium">
                  Semaine
                </Label>
                <Input
                  id="week"
                  type="number"
                  value={week}
                  onChange={(e) => setWeek(Number(e.target.value))}
                  min={1}
                  max={53}
                  className="h-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-medium">Langue</Label>
              <Select
                value={locale}
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

            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => router.push("/")}
              >
                Annuler
              </Button>
              <Button
                className="flex-1 shadow-sm shadow-primary/20"
                onClick={handleCreate}
                disabled={loading}
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Créer le brief
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
