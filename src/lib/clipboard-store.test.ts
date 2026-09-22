import { describe, it, expect } from "vitest";
import { formatCopyAge } from "./clipboard-store";

const NOW = Date.parse("2026-09-22T12:00:00Z");
const ago = (minutes: number) => new Date(NOW - minutes * 60000).toISOString();

describe("formatCopyAge", () => {
  it("dit depuis quand la copie a été faite", () => {
    expect(formatCopyAge(ago(0), NOW)).toBe("à l'instant");
    expect(formatCopyAge(ago(5), NOW)).toBe("il y a 5 minutes");
    expect(formatCopyAge(ago(180), NOW)).toBe("il y a 3 heures");
    expect(formatCopyAge(ago(60 * 24), NOW)).toBe("hier");
    expect(formatCopyAge(ago(60 * 24 * 3), NOW)).toBe("il y a 3 jours");
  });

  it("reste vide pour une copie sans date (faite avant cette information)", () => {
    expect(formatCopyAge(undefined, NOW)).toBe("");
    expect(formatCopyAge("pas une date", NOW)).toBe("");
  });
});
