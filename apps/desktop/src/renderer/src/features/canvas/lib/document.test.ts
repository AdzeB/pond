import { CanvasContentSchema, type CanvasItem } from "@shared/canvas-contracts";
import { describe, expect, it } from "vitest";
import {
  type CanvasNode,
  type CanvasSnapshot,
  CONNECTOR_STYLE,
  type ConnectorEdge,
  contentOf,
  createHistory,
  drawingFrom,
  duplicateOf,
  figureAt,
  GRID,
  noteAt,
  placeSaves,
  snapshotOf,
  textAt,
  toEdge,
  toNode,
} from "./document";

const items: CanvasItem[] = [
  {
    kind: "save",
    id: "card",
    x: 0,
    y: 0,
    width: 240,
    height: 220,
    saveId: "save-1",
  },
  {
    kind: "note",
    id: "note",
    x: 320,
    y: 10,
    width: 200,
    height: 200,
    text: "Why this font",
    color: "yellow",
  },
  {
    kind: "figure",
    id: "step",
    x: 600,
    y: 0,
    width: 192,
    height: 120,
    outline: "diamond",
    text: "Ship it",
    color: "blue",
  },
];

describe("canvas document", () => {
  it("round-trips items and styled connectors through board nodes", () => {
    const nodes = items.map(toNode);
    const connector = {
      ...CONNECTOR_STYLE,
      id: "link",
      from: "card",
      to: "step",
      fromSide: "right",
      toSide: "left",
      line: "elbow",
      startArrow: true,
      dashed: true,
      color: "red",
      label: "Next",
    } satisfies CanvasSnapshot["connectors"][number];
    const edges = [toEdge(connector)];
    const content = contentOf(nodes, edges, { x: 12.345, y: -4, zoom: 1.5 });
    expect(CanvasContentSchema.parse(content)).toEqual({
      viewport: { x: 12.35, y: -4, zoom: 1.5 },
      items,
      connectors: [connector],
    });
  });

  it("fills in the default style for connectors stored before styles existed", () => {
    const parsed = CanvasContentSchema.parse({
      viewport: { x: 0, y: 0, zoom: 1 },
      items,
      connectors: [
        {
          id: "link",
          from: "card",
          to: "note",
          fromSide: "right",
          toSide: "left",
        },
      ],
    });
    expect(parsed.connectors[0]).toMatchObject(CONNECTOR_STYLE);
  });

  it("drops connectors whose ends were removed", () => {
    const nodes = items.slice(0, 1).map(toNode);
    const edges: ConnectorEdge[] = [
      { id: "link", source: "card", target: "note" },
    ];
    expect(snapshotOf(nodes, edges).connectors).toEqual([]);
  });

  it("centres a batch of Saves on the drop point in rows of four", () => {
    const placed = placeSaves(["a", "b", "c", "d", "e"], { x: 0, y: 0 });
    expect(placed.map((item) => [item.x, item.y])).toEqual([
      [-552, -240],
      [-264, -240],
      [24, -240],
      [312, -240],
      [-552, 24],
    ]);
  });

  it("drops new items on the grid", () => {
    const note = noteAt({ x: 13, y: 50 }, "yellow");
    const text = textAt({ x: 37, y: 61 });
    const figure = figureAt({ x: 101, y: -7 }, "ellipse", "green");
    expect(figure).toMatchObject({
      kind: "figure",
      outline: "ellipse",
      text: "",
    });
    for (const value of [note.x, note.y, text.x, text.y, figure.x, figure.y])
      expect(Math.abs(value % GRID)).toBe(0);
  });

  it("stores stroke points relative to the drawing frame", () => {
    const drawing = drawingFrom(
      [
        [100, 200, 0.5],
        [140, 260, 0.5],
      ],
      "blue",
      4,
    );
    expect(drawing).toMatchObject({
      kind: "drawing",
      x: 96,
      y: 196,
      width: 48,
      height: 68,
      points: [
        [4, 4, 0.5],
        [44, 64, 0.5],
      ],
    });
    expect(drawingFrom([], "blue", 4)).toBeNull();
  });

  it("duplicates everything but Saves, with the connectors between copies", () => {
    const text: CanvasItem = {
      kind: "text",
      id: "label",
      x: 0,
      y: 300,
      width: 260,
      height: 56,
      text: "Type",
    };
    const snapshot = {
      items: [...items, text],
      connectors: [
        {
          ...CONNECTOR_STYLE,
          id: "inner",
          from: "note",
          to: "label",
          fromSide: "bottom",
          toSide: "top",
          dashed: true,
          label: "Reads as",
        },
        {
          ...CONNECTOR_STYLE,
          id: "outer",
          from: "card",
          to: "note",
          fromSide: "right",
          toSide: "left",
        },
      ] satisfies CanvasSnapshot["connectors"],
    };
    const copy = duplicateOf(snapshot, new Set(["card", "note", "label"]));
    expect(copy.items.map((item) => [item.kind, item.x, item.y])).toEqual([
      ["note", 344, 34],
      ["text", 24, 324],
    ]);
    const [note, label] = copy.items;
    expect(copy.connectors).toEqual([
      expect.objectContaining({
        from: note?.id,
        to: label?.id,
        dashed: true,
        label: "Reads as",
      }),
    ]);
    expect(copy.items.map((item) => item.id)).not.toContain("note");
  });

  it("undoes and redoes snapshots in order", () => {
    const history = createHistory(2);
    const first = snapshotOf(items.slice(0, 1).map(toNode), []);
    const second = snapshotOf(items.map(toNode), []);
    const third = snapshotOf([] satisfies CanvasNode[], []);
    history.record(first);
    history.record(second);
    expect(history.undo(third)).toBe(second);
    expect(history.undo(second)).toBe(first);
    expect(history.undo(first)).toBeNull();
    expect(history.redo(first)).toBe(second);
    expect(history.redo(second)).toBe(third);
    expect(history.redo(third)).toBeNull();
  });
});
