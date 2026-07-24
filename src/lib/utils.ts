import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function buildSlug(
  year: number,
  week: number,
  locale: string,
  index: number,
): string {
  return `${year}-wk${String(week).padStart(2, "0")}-${locale}-${index}`;
}

// Semaine ISO-8601 (lundi premier jour, semaine 1 = celle contenant le
// premier jeudi de l'année) — même algorithme utilisé par le sélecteur de
// semaine (week-input.tsx) pour que le calendrier calcule les mêmes numéros.
export function getISOWeek(date: Date): number {
  const target = new Date(date.valueOf());
  target.setDate(target.getDate() + 3 - ((target.getDay() + 6) % 7));
  const firstThursday = new Date(target.getFullYear(), 0, 4);
  firstThursday.setDate(
    firstThursday.getDate() + 3 - ((firstThursday.getDay() + 6) % 7),
  );
  return (
    1 +
    Math.round(
      (target.getTime() - firstThursday.getTime()) / (7 * 24 * 3600 * 1000),
    )
  );
}

export function getCurrentWeek(): number {
  return getISOWeek(new Date());
}
