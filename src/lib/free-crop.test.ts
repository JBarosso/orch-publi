import { describe, it, expect } from "vitest";
import { FULL_RECT, dragCropRect, isFullRect } from "./free-crop";

describe("dragCropRect", () => {
  it("tire un bord ou un coin sans bouger les bords opposés", () => {
    expect(dragCropRect(FULL_RECT, "w", 0.2, 0)).toEqual({ x: 0.2, y: 0, w: 0.8, h: 1 });
    const corner = dragCropRect(FULL_RECT, "se", -0.25, -0.5);
    expect(corner).toEqual({ x: 0, y: 0, w: 0.75, h: 0.5 });
  });

  it("reste dans l'image et garde une taille minimale", () => {
    expect(dragCropRect(FULL_RECT, "n", -0.3, -0.3)).toEqual(FULL_RECT);
    const squashed = dragCropRect(FULL_RECT, "e", -5, 0);
    expect(squashed.w).toBeCloseTo(0.02);
  });

  it("déplace le cadre entier sans le faire sortir de l'image", () => {
    const rect = { x: 0.1, y: 0.1, w: 0.5, h: 0.5 };
    const moved = dragCropRect(rect, "move", 0.2, 0.1);
    expect([moved.x, moved.y, moved.w, moved.h].map((v) => v.toFixed(3))).toEqual(["0.300", "0.200", "0.500", "0.500"]);
    expect(dragCropRect(rect, "move", 1, -1)).toEqual({ x: 0.5, y: 0, w: 0.5, h: 0.5 });
  });
});

describe("isFullRect", () => {
  it("ne recadre que si le cadre a bougé", () => {
    expect(isFullRect(FULL_RECT)).toBe(true);
    expect(isFullRect({ x: 0.1, y: 0, w: 0.9, h: 1 })).toBe(false);
  });
});
