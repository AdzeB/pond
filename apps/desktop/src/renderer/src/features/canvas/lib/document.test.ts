import { CanvasContentSchema, type CanvasItem } from "@shared/canvas-contracts";
import { describe, expect, it } from "vitest";
import {
  alignFrames,
  type Bounds,
  type CanvasNode,
  type CanvasSnapshot,
  CONNECTOR_STYLE,
  type ConnectorEdge,
  clipOf,
  clipText,
  contentOf,
  createHistory,
  distributeFrames,
  drawingFrom,
  duplicateOf,
  figureAt,
  GRID,
  isLocked,
  noteAt,
  pasteOf,
  placeSaves,
  reorder,
  snapshotOf,
  textAt,
  tidyFrames,
  toEdge,
  toNode,
  withLock,
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

function itemAt(index: number): CanvasItem {
  const item = items[index];
  if (!item) throw new Error(`No item at ${index}`);
  return item;
}

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

  it("keeps a locked item locked through the board and back", () => {
    const locked = { ...itemAt(1), locked: true };
    const node = toNode(locked);
    expect(isLocked(node)).toBe(true);
    expect(node).toMatchObject({ draggable: false, deletable: false });
    expect(snapshotOf([node], []).items).toEqual([locked]);
    const unlocked = withLock(node, false);
    expect(isLocked(unlocked)).toBe(false);
    expect(snapshotOf([unlocked], []).items[0]).not.toHaveProperty("locked");
  });

  it("copies the picked items with the connectors between them", () => {
    const snapshot: CanvasSnapshot = {
      items,
      connectors: [
        {
          ...CONNECTOR_STYLE,
          id: "inner",
          from: "note",
          to: "step",
          fromSide: "right",
          toSide: "left",
        },
        {
          ...CONNECTOR_STYLE,
          id: "outer",
          from: "card",
          to: "note",
          fromSide: "right",
          toSide: "left",
        },
      ],
    };
    const clip = clipOf(snapshot, new Set(["note", "step"]));
    expect(clip.items.map((item) => item.id)).toEqual(["note", "step"]);
    expect(clip.connectors.map((connector) => connector.id)).toEqual(["inner"]);
    expect(clipText(clip)).toBe("Why this font\n\nShip it");
  });

  it("pastes a clip centred on the point with fresh, unlocked copies", () => {
    const clip: CanvasSnapshot = {
      items: [{ ...itemAt(0), locked: true }, itemAt(1)],
      connectors: [
        {
          ...CONNECTOR_STYLE,
          id: "link",
          from: "card",
          to: "note",
          fromSide: "right",
          toSide: "left",
        },
      ],
    };
    const pasted = pasteOf(clip, { x: 1000, y: 1000 }, new Set());
    expect(pasted.items.map((item) => [item.kind, item.x, item.y])).toEqual([
      ["save", 744, 888],
      ["note", 1064, 898],
    ]);
    expect(pasted.items.some((item) => item.locked)).toBe(false);
    const [card, note] = pasted.items;
    expect(pasted.connectors).toEqual([
      expect.objectContaining({ from: card?.id, to: note?.id }),
    ]);
  });

  it("leaves out Saves the board already holds when pasting", () => {
    const pasted = pasteOf(
      { items: items.slice(0, 2), connectors: [] },
      { x: 0, y: 0 },
      new Set(["save-1"]),
    );
    expect(pasted.items.map((item) => item.kind)).toEqual(["note"]);
    expect(
      pasteOf(
        { items: items.slice(0, 1), connectors: [] },
        { x: 0, y: 0 },
        new Set(["save-1"]),
      ).items,
    ).toEqual([]);
  });

  it("sizes pasted text to its lines", () => {
    expect(textAt({ x: 0, y: 0 }, "one\ntwo\nthree")).toMatchObject({
      kind: "text",
      text: "one\ntwo\nthree",
      height: 4 * GRID,
    });
  });

  const frames: Bounds[] = [
    { id: "a", x: 0, y: 0, width: 100, height: 50 },
    { id: "b", x: 300, y: 40, width: 60, height: 100 },
    { id: "c", x: 120, y: 200, width: 40, height: 20 },
  ];

  it("aligns frames to the edges and centres of their shared bounds", () => {
    expect(Object.fromEntries(alignFrames(frames, "left"))).toEqual({
      a: { x: 0, y: 0 },
      b: { x: 0, y: 40 },
      c: { x: 0, y: 200 },
    });
    expect(Object.fromEntries(alignFrames(frames, "right"))).toEqual({
      a: { x: 260, y: 0 },
      b: { x: 300, y: 40 },
      c: { x: 320, y: 200 },
    });
    expect(Object.fromEntries(alignFrames(frames, "middle"))).toEqual({
      a: { x: 0, y: 85 },
      b: { x: 300, y: 60 },
      c: { x: 120, y: 100 },
    });
  });

  it("spaces frames evenly between the outermost two", () => {
    expect(Object.fromEntries(distributeFrames(frames, "horizontal"))).toEqual({
      a: { x: 0, y: 0 },
      c: { x: 180, y: 200 },
      b: { x: 300, y: 40 },
    });
    expect(distributeFrames(frames.slice(0, 2), "vertical").size).toBe(0);
  });

  it("tidies frames into a near-square grid in reading order", () => {
    const tidy = tidyFrames([
      ...frames,
      { id: "d", x: 500, y: 0, width: 80, height: 80 },
    ]);
    expect(Object.fromEntries(tidy)).toEqual({
      a: { x: 0, y: 0 },
      d: { x: 100 + GRID, y: 0 },
      c: { x: 0, y: 80 + GRID },
      b: { x: 100 + GRID, y: 80 + GRID },
    });
  });

  it("moves picked entries through the paint order", () => {
    const list = ["a", "b", "c", "d"].map((id) => ({ id }));
    const ids = (entries: { id: string }[]) => entries.map(({ id }) => id);
    const picked = new Set(["a", "c"]);
    expect(ids(reorder(list, picked, "front"))).toEqual(["b", "d", "a", "c"]);
    expect(ids(reorder(list, picked, "back"))).toEqual(["a", "c", "b", "d"]);
    expect(ids(reorder(list, picked, "forward"))).toEqual(["b", "a", "d", "c"]);
    expect(ids(reorder(list, new Set(["b", "c"]), "backward"))).toEqual([
      "b",
      "c",
      "a",
      "d",
    ]);
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
