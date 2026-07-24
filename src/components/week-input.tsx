"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn, getISOWeek } from "@/lib/utils";

const MONTH_LABEL = new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric" });
const DAY_LABELS = ["L", "M", "M", "J", "V", "S", "D"];

interface WeekInputProps {
  value: number;
  onChange: (week: number) => void;
  year: number;
  min?: number;
  max?: number;
  className?: string;
  id?: string;
}

// Grille de 6 lignes x 7 jours (lun-dim) couvrant le mois affiché, avec les
// jours des mois adjacents pour remplir la grille (grisés mais cliquables —
// une semaine à cheval sur 2 mois reste une semaine valide).
function buildMonthGrid(viewMonth: Date): Date[][] {
  const firstOfMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), 1);
  const startOffset = (firstOfMonth.getDay() + 6) % 7; // lundi = 0
  const gridStart = new Date(firstOfMonth);
  gridStart.setDate(gridStart.getDate() - startOffset);

  const rows: Date[][] = [];
  const cursor = new Date(gridStart);
  for (let row = 0; row < 6; row++) {
    const days: Date[] = [];
    for (let col = 0; col < 7; col++) {
      days.push(new Date(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }
    rows.push(days);
  }
  return rows;
}

// Dropdown "maison" (pas de Popover Base UI) : positionnement simple en CSS,
// pas de floating-ui/ResizeObserver — juste un clic extérieur pour fermer.
export function WeekInput({ value, onChange, year, min = 1, max = 53, className, id }: WeekInputProps) {
  const [open, setOpen] = useState(false);
  const [viewMonth, setViewMonth] = useState(() => new Date(year, 0, 1));
  const [hoveredRow, setHoveredRow] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const weeks = useMemo(() => buildMonthGrid(viewMonth), [viewMonth]);

  const toggleOpen = () => {
    setOpen((prev) => {
      const next = !prev;
      if (next) setViewMonth(new Date(year, 0, 1));
      return next;
    });
  };

  const pickDate = (date: Date) => {
    onChange(getISOWeek(date));
    setOpen(false);
  };

  return (
    <div ref={containerRef} className="relative">
      <Input
        id={id}
        type="number"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        min={min}
        max={max}
        className={cn("pr-9", className)}
      />
      <button
        type="button"
        onClick={toggleOpen}
        className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground/50 transition-colors hover:text-foreground"
        title="Choisir une semaine sur le calendrier"
      >
        <CalendarDays className="h-4 w-4" />
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-1 w-64 rounded-lg border border-border/60 bg-popover p-3 text-popover-foreground shadow-md">
          <div className="mb-2 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setViewMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1))}
              className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            <span className="text-xs font-medium capitalize">{MONTH_LABEL.format(viewMonth)}</span>
            <button
              type="button"
              onClick={() => setViewMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1))}
              className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-0.5">
            {DAY_LABELS.map((d, i) => (
              <span key={i} className="text-center text-[10px] font-medium text-muted-foreground/60">
                {d}
              </span>
            ))}
          </div>

          <div className="mt-1 space-y-0.5">
            {weeks.map((row, rowIndex) => {
              const rowWeek = getISOWeek(row[3]); // jeudi de la ligne : sans ambiguïté ISO
              const isSelected = rowWeek === value;
              const isHovered = hoveredRow === rowIndex;
              return (
                <div
                  key={rowIndex}
                  className={cn(
                    "grid grid-cols-7 gap-0.5 rounded-md transition-colors",
                    isSelected && "bg-primary/15",
                    isHovered && !isSelected && "bg-muted",
                  )}
                  onMouseEnter={() => setHoveredRow(rowIndex)}
                  onMouseLeave={() => setHoveredRow(null)}
                >
                  {row.map((day, dayIndex) => {
                    const inMonth = day.getMonth() === viewMonth.getMonth();
                    return (
                      <button
                        key={dayIndex}
                        type="button"
                        onClick={() => pickDate(day)}
                        className={cn(
                          "rounded py-1 text-center text-xs transition-colors",
                          inMonth ? "text-foreground" : "text-muted-foreground/30",
                          isSelected ? "font-semibold text-primary" : "hover:bg-primary/10",
                        )}
                      >
                        {day.getDate()}
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
