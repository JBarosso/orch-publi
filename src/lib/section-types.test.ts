import { describe, it, expect } from "vitest";
import { DEFAULT_HIDDEN_SECTION_TYPES, sanitizeHiddenSectionTypes } from "./section-types";

describe("sanitizeHiddenSectionTypes", () => {
  it("masque les anciennes versions tant que rien n'a été enregistré", () => {
    expect(sanitizeHiddenSectionTypes(undefined)).toEqual(DEFAULT_HIDDEN_SECTION_TYPES);
    expect(DEFAULT_HIDDEN_SECTION_TYPES).toEqual(["macarons", "mea"]);
  });

  it("respecte un choix vide (tout afficher) et écarte l'inconnu et les doublons", () => {
    expect(sanitizeHiddenSectionTypes([])).toEqual([]);
    expect(sanitizeHiddenSectionTypes(["mea", "inconnu", "mea", 42, "moodboard"])).toEqual(["mea", "moodboard"]);
  });
});
