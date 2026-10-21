import type { CanvasItem } from "@shared/canvas-contracts";
import { describe, expect, it } from "vitest";
import {
  cropOf,
  eraseDrawings,
  itemForRect,
  noteFromText,
  notesSorted,
  quickPair,
  snappedTurn,
  turned,
} from "./edit";
import { richNote } from "./rich-text";

describe("canvas editing", () => {
  it("snaps a dragged rectangle and keeps a minimum size", () => {
    const item = itemForRect(
      "note",
      { x: 10, y: 14, width: 30, height: 20 },
      { color: "yellow", outline: "rectangle", language: "text" },
    );
    expect(item.kind).toBe("note");
    expect(item.x).toBe(0);
    expect(item.y).toBe(24);
    expect(item.width).toBeGreaterThanOrEqual(96);
    expect(item.height).toBeGreaterThanOrEqual(96);
  });

  it("places a copy on the requested side and connects it", () => {
    const note: CanvasItem = {
      kind: "note",
      id: "note",
      x: 0,
      y: 0,
      width: 100,
      height: 80,
      text: "Hello",
      color: "yellow",
    };
    const pair = quickPair(note, "right");
    expect(pair?.item).toMatchObject({
      kind: "note",
      x: 148,
      y: 0,
      text: "",
      color: "yellow",
    });
    expect(pair?.connector).toMatchObject({
      from: "note",
      fromSide: "right",
      toSide: "left",
    });
  });

  it("drops rotation once an item is upright again", () => {
    expect(turned(345, 15)).toBeUndefined();
    expect(turned(undefined, -15)).toBe(345);
    expect(snappedTurn(20)).toBe(15);
    expect(snappedTurn(7)).toBeUndefined();
  });

  it("turns text into a note without moving it", () => {
    const text: CanvasItem = {
      kind: "text",
      id: "line",
      x: 12,
      y: 24,
      width: 80,
      height: 32,
      text: "Idea",
    };
    expect(noteFromText(text, "blue")).toMatchObject({
      kind: "note",
      id: "line",
      x: 12,
      text: "Idea",
      color: "blue",
    });
  });

  it("sorts notes into color order from the selection's top left", () => {
    const positions = notesSorted([
      { id: "b", color: "blue", x: 40, y: 10, width: 20, height: 20 },
      { id: "a", color: "gray", x: 0, y: 30, width: 20, height: 20 },
    ]);
    expect(positions.get("a")).toEqual({ x: 0, y: 10 });
    expect(positions.get("b")?.x).toBeGreaterThan(0);
  });

  it("splits a stroke where the eraser crosses it", () => {
    const drawing: CanvasItem = {
      kind: "drawing",
      id: "stroke",
      x: 0,
      y: 0,
      width: 100,
      height: 10,
      color: "gray",
      size: 4,
      points: [
        [0, 0, 0.5],
        [10, 0, 0.5],
        [20, 0, 0.5],
        [30, 0, 0.5],
        [40, 0, 0.5],
        [50, 0, 0.5],
      ],
    };
    const next = eraseDrawings([drawing], [[25, 0, 0.5]], 8);
    const drawings = next?.filter((item) => item.kind === "drawing") ?? [];
    expect(drawings.length).toBe(2);
    expect(drawings.every((item) => item.id !== "stroke")).toBe(true);
  });

  it("keeps a crop inside the image", () => {
    expect(cropOf({ x: 0.1, y: 0.2 }, { x: 0.5, y: 0.8 })).toEqual({
      x: 0.1,
      y: 0.2,
      width: 0.4,
      height: 0.6,
    });
    expect(cropOf({ x: 0.1, y: 0.1 }, { x: 0.11, y: 0.11 })).toBeNull();
  });

  it("keeps note formatting and drops everything else", () => {
    expect(richNote("<b>Hello</b>")).toBe("<b>Hello</b>");
    expect(richNote("<script>alert(1)</script>Hi")).toBe("Hi");
    expect(richNote("<div>One</div><div>Two</div>")).toBe("One\nTwo");
    expect(richNote('<img src="x" onerror="alert(1)">')).toBe("");
  });
});
