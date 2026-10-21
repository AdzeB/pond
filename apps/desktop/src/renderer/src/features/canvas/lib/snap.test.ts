import { describe, expect, it } from "vitest";
import { snapResize, snapToObjects } from "./snap";

describe("canvas snapping", () => {
  const anchor = { id: "anchor", x: 100, y: 100, width: 200, height: 100 };

  it("pulls the nearest edge or centre onto another item's", () => {
    const pulled = snapToObjects(
      { id: "", x: 304, y: 147, width: 100, height: 100 },
      [anchor],
      6,
    );
    expect(pulled.x).toBe(-4);
    expect(pulled.y).toBe(3);
    expect(pulled.guides).toEqual([
      { axis: "x", at: 300, from: 100, to: 247 },
      { axis: "y", at: 150, from: 100, to: 404 },
    ]);
  });

  it("leaves an axis free when nothing is within reach", () => {
    const pulled = snapToObjects(
      { id: "", x: 340, y: 103, width: 20, height: 20 },
      [anchor],
      6,
    );
    expect(pulled.x).toBeNull();
    expect(pulled.y).toBe(-3);
    expect(pulled.guides).toHaveLength(1);
  });

  it("puts only the edges a resize moved on the grid", () => {
    const before = { id: "a", x: 10, y: 10, width: 100, height: 100 };
    expect(snapResize(before, { ...before, width: 130 })).toEqual({
      ...before,
      width: 134,
    });
    expect(
      snapResize(before, { ...before, x: -15, width: 125, height: 90 }),
    ).toEqual({ id: "a", x: -24, y: 10, width: 134, height: 86 });
  });
});
