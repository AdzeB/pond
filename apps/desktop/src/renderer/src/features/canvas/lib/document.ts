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

type Frame = "id" | "kind" | "x" | "y" | "width" | "height" | "locked";
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
const LINE_HEIGHT = 24;
const GAP = 48;
const COLUMNS = 4;
const DUPLICATE_OFFSET = GRID;

export type Bounds = Pick<CanvasItem, "id" | "x" | "y" | "width" | "height">;
export type AlignEdge =
  | "left"
  | "center"
  | "right"
  | "top"
  | "middle"
  | "bottom";
export type Axis = "horizontal" | "vertical";
export type LayerMove = "front" | "forward" | "backward" | "back";

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

export function isLocked(node: CanvasNode): boolean {
  return node.draggable === false;
}

/** Unlocked nodes leave the flags unset so the board's tool still decides whether they drag. */
export function withLock(node: CanvasNode, locked: boolean): CanvasNode {
  return {
    ...node,
    draggable: locked ? false : undefined,
    deletable: locked ? false : undefined,
  };
}

export function toNode(item: CanvasItem): CanvasNode {
  const base: Pick<
    CanvasNode,
    "id" | "position" | "width" | "height" | "draggable" | "deletable"
  > = {
    id: item.id,
    position: { x: item.x, y: item.y },
    width: item.width,
    height: item.height,
  };
  if (item.locked) {
    base.draggable = false;
    base.deletable = false;
  }
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
  const frame: Omit<Pick<CanvasItem, Frame>, "kind"> = {
    id: node.id,
    x: round(node.position.x),
    y: round(node.position.y),
    width: round(Math.max(1, node.width ?? node.measured?.width ?? 1)),
    height: round(Math.max(1, node.height ?? node.measured?.height ?? 1)),
  };
  if (isLocked(node)) frame.locked = true;
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

export function frameOf(node: CanvasNode): Bounds {
  const { id, x, y, width, height } = toItem(node);
  return { id, x, y, width, height };
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

export function textAt(point: XYPosition, text = ""): CanvasItem {
  const lines = text.split("\n").length;
  const height = Math.max(TEXT_SIZE.height, (lines + 1) * LINE_HEIGHT);
  return {
    kind: "text",
    id: newId(),
    x: snap(point.x),
    y: snap(point.y - height / 2),
    width: TEXT_SIZE.width,
    height,
    text,
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

/** Copies take fresh IDs and start unlocked; a connector survives only when both of its ends were copied. */
function copyOf(source: CanvasSnapshot, offset: XYPosition): CanvasSnapshot {
  const copies = new Map<string, string>();
  const items = source.items.map((item) => {
    const id = newId();
    copies.set(item.id, id);
    return {
      ...item,
      id,
      locked: undefined,
      x: round(item.x + offset.x),
      y: round(item.y + offset.y),
    };
  });
  const connectors = source.connectors.flatMap((connector) => {
    const from = copies.get(connector.from);
    const to = copies.get(connector.to);
    return from && to ? [{ ...connector, id: newId(), from, to }] : [];
  });
  return { items, connectors };
}

/** Saves sit on a board once, so a duplicate copies everything else and the connectors between the copies. */
export function duplicateOf(
  snapshot: CanvasSnapshot,
  ids: ReadonlySet<string>,
): CanvasSnapshot {
  return copyOf(
    {
      items: snapshot.items.filter(
        (item) => ids.has(item.id) && item.kind !== "save",
      ),
      connectors: snapshot.connectors,
    },
    { x: DUPLICATE_OFFSET, y: DUPLICATE_OFFSET },
  );
}

export function clipOf(
  snapshot: CanvasSnapshot,
  ids: ReadonlySet<string>,
): CanvasSnapshot {
  const items = snapshot.items.filter((item) => ids.has(item.id));
  const kept = new Set(items.map((item) => item.id));
  return {
    items,
    connectors: snapshot.connectors.filter(
      (connector) => kept.has(connector.from) && kept.has(connector.to),
    ),
  };
}

export function clipText(clip: CanvasSnapshot): string {
  return clip.items
    .flatMap((item) => ("text" in item && item.text.trim() ? [item.text] : []))
    .join("\n\n");
}

/** A pasted clip keeps its layout and lands centred on the point, skipping Saves the board already holds. */
export function pasteOf(
  clip: CanvasSnapshot,
  center: XYPosition,
  onBoard: ReadonlySet<string>,
): CanvasSnapshot {
  const seen = new Set(onBoard);
  const items = clip.items.filter((item) => {
    if (item.kind !== "save") return true;
    if (seen.has(item.saveId)) return false;
    seen.add(item.saveId);
    return true;
  });
  const box = extentOf(items);
  if (!box) return { items: [], connectors: [] };
  return copyOf(
    { items, connectors: clip.connectors },
    {
      x: snap(center.x - (box.left + box.right) / 2),
      y: snap(center.y - (box.top + box.bottom) / 2),
    },
  );
}

function extentOf(frames: readonly Bounds[]) {
  if (!frames.length) return null;
  return {
    left: Math.min(...frames.map((frame) => frame.x)),
    top: Math.min(...frames.map((frame) => frame.y)),
    right: Math.max(...frames.map((frame) => frame.x + frame.width)),
    bottom: Math.max(...frames.map((frame) => frame.y + frame.height)),
  };
}

export function alignFrames(
  frames: readonly Bounds[],
  edge: AlignEdge,
): Map<string, XYPosition> {
  const box = extentOf(frames);
  const moved = new Map<string, XYPosition>();
  if (!box) return moved;
  for (const frame of frames) {
    const x =
      edge === "left"
        ? box.left
        : edge === "center"
          ? (box.left + box.right - frame.width) / 2
          : edge === "right"
            ? box.right - frame.width
            : frame.x;
    const y =
      edge === "top"
        ? box.top
        : edge === "middle"
          ? (box.top + box.bottom - frame.height) / 2
          : edge === "bottom"
            ? box.bottom - frame.height
            : frame.y;
    moved.set(frame.id, { x: round(x), y: round(y) });
  }
  return moved;
}

/** The outermost frames stay put and the rest spread out so every gap between neighbours is equal. */
export function distributeFrames(
  frames: readonly Bounds[],
  axis: Axis,
): Map<string, XYPosition> {
  const start = axis === "horizontal" ? "x" : "y";
  const size = axis === "horizontal" ? "width" : "height";
  const sorted = [...frames].sort((a, b) => a[start] - b[start]);
  const moved = new Map<string, XYPosition>();
  const first = sorted[0];
  if (!first || sorted.length < 3) return moved;
  const end = Math.max(...sorted.map((frame) => frame[start] + frame[size]));
  const occupied = sorted.reduce((total, frame) => total + frame[size], 0);
  const gap = (end - first[start] - occupied) / (sorted.length - 1);
  let cursor = first[start];
  for (const frame of sorted) {
    const at = round(cursor);
    moved.set(
      frame.id,
      axis === "horizontal" ? { x: at, y: frame.y } : { x: frame.x, y: at },
    );
    cursor += frame[size] + gap;
  }
  return moved;
}

/** Tidy Up lays the frames out in reading order on a near-square grid with one grid step between cells. */
export function tidyFrames(frames: readonly Bounds[]): Map<string, XYPosition> {
  const box = extentOf(frames);
  const moved = new Map<string, XYPosition>();
  if (!box) return moved;
  const columns = Math.ceil(Math.sqrt(frames.length));
  const cell = Math.max(...frames.map((frame) => frame.width));
  const ordered = [...frames].sort((a, b) => a.y - b.y || a.x - b.x);
  let top = box.top;
  for (let index = 0; index < ordered.length; index += columns) {
    const row = ordered.slice(index, index + columns).sort((a, b) => a.x - b.x);
    row.forEach((frame, column) => {
      moved.set(frame.id, {
        x: round(box.left + column * (cell + GRID)),
        y: round(top),
      });
    });
    top += Math.max(...row.map((frame) => frame.height)) + GRID;
  }
  return moved;
}

/** List order is paint order, so the last entry draws on top. */
export function reorder<Entry extends { id: string }>(
  list: readonly Entry[],
  ids: ReadonlySet<string>,
  move: LayerMove,
): Entry[] {
  const picked = list.filter((entry) => ids.has(entry.id));
  const rest = list.filter((entry) => !ids.has(entry.id));
  if (move === "front") return [...rest, ...picked];
  if (move === "back") return [...picked, ...rest];
  const next = [...list];
  const step = move === "forward" ? 1 : -1;
  const order =
    move === "forward"
      ? next.map((_, index) => next.length - 2 - index)
      : next.map((_, index) => index + 1);
  for (const index of order) {
    const here = next[index];
    const there = next[index + step];
    if (!here || !there || !ids.has(here.id) || ids.has(there.id)) continue;
    next[index] = there;
    next[index + step] = here;
  }
  return next;
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
