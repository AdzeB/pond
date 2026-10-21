import {
  CANVAS_SIDES,
  type CanvasColor,
  type CanvasConnector,
  type CanvasContent,
  type CanvasItem,
  type CanvasOutline,
  type CanvasSide,
  type CanvasViewport,
} from "@shared/canvas-contracts";
import type { Edge, Node, XYPosition } from "@xyflow/react";

type Frame = "id" | "kind" | "x" | "y" | "width" | "height";
type DataOf<Kind extends CanvasItem["kind"]> = Omit<
  Extract<CanvasItem, { kind: Kind }>,
  Frame
>;

export type SaveNode = Node<DataOf<"save">, "save">;
export type NoteNode = Node<DataOf<"note">, "note">;
export type TextNode = Node<DataOf<"text">, "text">;
export type DrawingNode = Node<DataOf<"drawing">, "drawing">;
export type FigureNode = Node<DataOf<"figure">, "figure">;
export type CanvasNode =
  | SaveNode
  | NoteNode
  | TextNode
  | DrawingNode
  | FigureNode;

export type ConnectorStyle = Omit<
  CanvasConnector,
  "id" | "from" | "to" | "fromSide" | "toSide"
>;
export type ConnectorEdge = Edge<ConnectorStyle, "connector">;

export const CONNECTOR_STYLE: ConnectorStyle = {
  line: "curved",
  startArrow: false,
  endArrow: true,
  dashed: false,
  color: "gray",
  label: "",
};

export type StrokePoint = [x: number, y: number, pressure: number];

export interface CanvasSnapshot {
  items: CanvasItem[];
  connectors: CanvasConnector[];
}

export const GRID = 24;

const SAVE_SIZE = { width: 240, height: 216 };
const NOTE_SIZE = { width: 192, height: 192 };
const TEXT_SIZE = { width: 264, height: 48 };
const FIGURE_SIZE = { width: 192, height: 192 };
const GAP = 48;
const COLUMNS = 4;
const DUPLICATE_OFFSET = GRID;

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

function snap(value: number): number {
  return Math.round(value / GRID) * GRID;
}

export function newId(): string {
  return crypto.randomUUID();
}

function isSide(value: string | null | undefined): value is CanvasSide {
  return CANVAS_SIDES.some((side) => side === value);
}

export function toNode(item: CanvasItem): CanvasNode {
  const base = {
    id: item.id,
    position: { x: item.x, y: item.y },
    width: item.width,
    height: item.height,
  };
  switch (item.kind) {
    case "save":
      return { ...base, type: "save", data: { saveId: item.saveId } };
    case "note":
      return {
        ...base,
        type: "note",
        data: { text: item.text, color: item.color },
      };
    case "text":
      return { ...base, type: "text", data: { text: item.text } };
    case "figure":
      return {
        ...base,
        type: "figure",
        data: { outline: item.outline, text: item.text, color: item.color },
      };
    case "drawing":
      return {
        ...base,
        type: "drawing",
        data: { color: item.color, size: item.size, points: item.points },
      };
  }
}

function toItem(node: CanvasNode): CanvasItem {
  const frame = {
    id: node.id,
    x: round(node.position.x),
    y: round(node.position.y),
    width: round(Math.max(1, node.width ?? node.measured?.width ?? 1)),
    height: round(Math.max(1, node.height ?? node.measured?.height ?? 1)),
  };
  switch (node.type) {
    case "save":
      return { ...frame, kind: "save", saveId: node.data.saveId };
    case "note":
      return {
        ...frame,
        kind: "note",
        text: node.data.text,
        color: node.data.color,
      };
    case "text":
      return { ...frame, kind: "text", text: node.data.text };
    case "figure":
      return {
        ...frame,
        kind: "figure",
        outline: node.data.outline,
        text: node.data.text,
        color: node.data.color,
      };
    case "drawing":
      return {
        ...frame,
        kind: "drawing",
        color: node.data.color,
        size: node.data.size,
        points: node.data.points,
      };
    default:
      throw new Error(`Unknown canvas item ${frame.id}`);
  }
}

export function toEdge({
  id,
  from,
  to,
  fromSide,
  toSide,
  ...style
}: CanvasConnector): ConnectorEdge {
  return {
    id,
    type: "connector",
    source: from,
    target: to,
    sourceHandle: fromSide,
    targetHandle: toSide,
    data: style,
  };
}

function toConnector(edge: ConnectorEdge): CanvasConnector {
  return {
    ...CONNECTOR_STYLE,
    ...edge.data,
    id: edge.id,
    from: edge.source,
    to: edge.target,
    fromSide: isSide(edge.sourceHandle) ? edge.sourceHandle : "right",
    toSide: isSide(edge.targetHandle) ? edge.targetHandle : "left",
  };
}

export function snapshotOf(
  nodes: readonly CanvasNode[],
  edges: readonly ConnectorEdge[],
): CanvasSnapshot {
  const ids = new Set(nodes.map((node) => node.id));
  return {
    items: nodes.map(toItem),
    connectors: edges
      .filter((edge) => ids.has(edge.source) && ids.has(edge.target))
      .map(toConnector),
  };
}

export function contentOf(
  nodes: readonly CanvasNode[],
  edges: readonly ConnectorEdge[],
  viewport: CanvasViewport,
): CanvasContent {
  return {
    viewport: {
      x: round(viewport.x),
      y: round(viewport.y),
      zoom: round(viewport.zoom),
    },
    ...snapshotOf(nodes, edges),
  };
}

/** Saves dropped together fan out in a grid centred on the drop point. */
export function placeSaves(
  saveIds: readonly string[],
  center: XYPosition,
): CanvasItem[] {
  const columns = Math.min(COLUMNS, saveIds.length);
  const rows = Math.ceil(saveIds.length / COLUMNS);
  const left = snap(
    center.x - (columns * SAVE_SIZE.width + (columns - 1) * GAP) / 2,
  );
  const top = snap(center.y - (rows * SAVE_SIZE.height + (rows - 1) * GAP) / 2);
  return saveIds.map((saveId, index) => ({
    kind: "save",
    id: newId(),
    saveId,
    x: left + (index % COLUMNS) * (SAVE_SIZE.width + GAP),
    y: top + Math.floor(index / COLUMNS) * (SAVE_SIZE.height + GAP),
    ...SAVE_SIZE,
  }));
}

export function noteAt(point: XYPosition, color: CanvasColor): CanvasItem {
  return {
    kind: "note",
    id: newId(),
    x: snap(point.x - NOTE_SIZE.width / 2),
    y: snap(point.y - NOTE_SIZE.height / 2),
    ...NOTE_SIZE,
    text: "",
    color,
  };
}

export function textAt(point: XYPosition): CanvasItem {
  return {
    kind: "text",
    id: newId(),
    x: snap(point.x),
    y: snap(point.y - TEXT_SIZE.height / 2),
    ...TEXT_SIZE,
    text: "",
  };
}

export function figureAt(
  point: XYPosition,
  outline: CanvasOutline,
  color: CanvasColor,
): CanvasItem {
  return {
    kind: "figure",
    id: newId(),
    x: snap(point.x - FIGURE_SIZE.width / 2),
    y: snap(point.y - FIGURE_SIZE.height / 2),
    ...FIGURE_SIZE,
    outline,
    text: "",
    color,
  };
}

/** Stroke points are stored relative to the drawing's own frame so moving it never rewrites them. */
export function drawingFrom(
  points: readonly StrokePoint[],
  color: CanvasColor,
  size: number,
): CanvasItem | null {
  if (!points.length) return null;
  const xs = points.map(([x]) => x);
  const ys = points.map(([, y]) => y);
  const left = Math.min(...xs) - size;
  const top = Math.min(...ys) - size;
  return {
    kind: "drawing",
    id: newId(),
    x: round(left),
    y: round(top),
    width: round(Math.max(1, Math.max(...xs) + size - left)),
    height: round(Math.max(1, Math.max(...ys) + size - top)),
    color,
    size,
    points: points.map(([x, y, pressure]) => [
      round(x - left),
      round(y - top),
      round(pressure),
    ]),
  };
}

/** Saves sit on a board once, so a duplicate copies everything else and the connectors between the copies. */
export function duplicateOf(
  snapshot: CanvasSnapshot,
  ids: ReadonlySet<string>,
): CanvasSnapshot {
  const copies = new Map<string, string>();
  const items = snapshot.items.flatMap((item) => {
    if (!ids.has(item.id) || item.kind === "save") return [];
    const id = newId();
    copies.set(item.id, id);
    return [
      {
        ...item,
        id,
        x: round(item.x + DUPLICATE_OFFSET),
        y: round(item.y + DUPLICATE_OFFSET),
      },
    ];
  });
  const connectors = snapshot.connectors.flatMap((connector) => {
    const from = copies.get(connector.from);
    const to = copies.get(connector.to);
    return from && to ? [{ ...connector, id: newId(), from, to }] : [];
  });
  return { items, connectors };
}

export function createHistory(limit = 100) {
  let past: CanvasSnapshot[] = [];
  let future: CanvasSnapshot[] = [];
  return {
    record(snapshot: CanvasSnapshot): void {
      past = [...past.slice(-(limit - 1)), snapshot];
      future = [];
    },
    undo(current: CanvasSnapshot): CanvasSnapshot | null {
      const previous = past.at(-1);
      if (!previous) return null;
      past = past.slice(0, -1);
      future = [...future, current];
      return previous;
    },
    redo(current: CanvasSnapshot): CanvasSnapshot | null {
      const next = future.at(-1);
      if (!next) return null;
      future = future.slice(0, -1);
      past = [...past, current];
      return next;
    },
  };
}
