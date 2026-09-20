import { describe, expect, it } from "vitest";
import { addPdfRenderWindow } from "./pdf-render-window";

describe("addPdfRenderWindow", () => {
  it("schedules only the visible page and its neighbors", () => {
    expect([...addPdfRenderWindow(new Set(), 5, 20)]).toEqual([4, 5, 6]);
  });

  it("bounds the render window at the document edges", () => {
    expect([...addPdfRenderWindow(new Set(), 1, 2)]).toEqual([1, 2]);
    expect([...addPdfRenderWindow(new Set(), 2, 2)]).toEqual([1, 2]);
  });

  it("retains pages that already rendered while scrolling", () => {
    expect([...addPdfRenderWindow(new Set([1, 2]), 4, 10)]).toEqual([
      1, 2, 3, 4, 5,
    ]);
  });
});
