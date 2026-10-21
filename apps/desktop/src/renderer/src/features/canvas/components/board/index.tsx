import type {
  Canvas,
  CanvasColor,
  CanvasConnector,
  CanvasContent,
  CanvasItem,
  CanvasOutline,
  CanvasSide,
} from "@shared/canvas-contracts";
import {
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  Background,
  BackgroundVariant,
  type Connection,
  ConnectionMode,
  type EdgeChange,
  type EdgeTypes,
  type NodeChange,
  type NodeTypes,
  type OnConnectEnd,
  type OnSelectionChangeParams,
  ReactFlow,
  type Rect,
  SelectionMode,
  useReactFlow,
  type Viewport,
  type XYPosition,
} from "@xyflow/react";
import "@xyflow/react/dist/base.css";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { isLibrarySaveDrag, saveDropIds } from "@/features/saves";
import {
  openSave,
  primarySelection,
  selection,
} from "@/features/saves/navigation";
import { ensureSaves, pool } from "@/features/saves/pool";
import { isEditableTarget } from "@/shared/lib/editable-target";
import { errorCopy } from "@/shared/lib/error-copy";
import { notify } from "@/shared/lib/toast";
import { claimUndo } from "@/shared/lib/undo-owner";
import {
  type CanvasNode,
  type CanvasSnapshot,
  CONNECTOR_STYLE,
  type ConnectorEdge,
  type ConnectorStyle,
  contentOf,
  createHistory,
  drawingFrom,
  duplicateOf,
  figureAt,
  GRID,
  newId,
  noteAt,
  placeSaves,
  type StrokePoint,
  snapshotOf,
  textAt,
  toEdge,
  toNode,
} from "../../lib/document";
import { canvases } from "../../state/canvases";
import { ConnectorEdge as ConnectorEdgeView } from "../connector-edge";
import { DrawLayer } from "../draw-layer";
import { DrawingItem } from "../drawing-item";
import { FigureItem } from "../figure-item";
import { NoteItem } from "../note-item";
import { SaveItem } from "../save-item";
import { SelectionBar } from "../selection-bar";
import { TextItem } from "../text-item";
import { type CanvasTool, Tools, toolForKey } from "../tools";
import { Zoom } from "../zoom";
import { type BoardActions, BoardContext } from "./context";
import styles from "./styles.module.css";

const NODE_TYPES: NodeTypes = {
  save: SaveItem,
  note: NoteItem,
  text: TextItem,
  drawing: DrawingItem,
  figure: FigureItem,
};

const EDGE_TYPES: EdgeTypes = { connector: ConnectorEdgeView };

const SNAP_GRID: [number, number] = [GRID, GRID];
const SAVE_DELAY_MS = 400;
const PEN_SIZE = 4;

function withColor(node: CanvasNode, color: CanvasColor): CanvasNode {
  if (!node.selected) return node;
  if (node.type === "note") return { ...node, data: { ...node.data, color } };
  if (node.type === "drawing")
    return { ...node, data: { ...node.data, color } };
  if (node.type === "figure") return { ...node, data: { ...node.data, color } };
  return node;
}

function withText(node: CanvasNode, id: string, text: string): CanvasNode {
  if (node.id !== id) return node;
  if (node.type === "note") return { ...node, data: { ...node.data, text } };
  if (node.type === "text") return { ...node, data: { ...node.data, text } };
  if (node.type === "figure") return { ...node, data: { ...node.data, text } };
  return node;
}

function hasText(node: CanvasNode): boolean {
  return node.type === "note" || node.type === "text" || node.type === "figure";
}

function nearestSide(bounds: Rect, point: XYPosition): CanvasSide {
  const gaps: Array<[CanvasSide, number]> = [
    ["top", point.y - bounds.y],
    ["right", bounds.x + bounds.width - point.x],
    ["bottom", bounds.y + bounds.height - point.y],
    ["left", point.x - bounds.x],
  ];
  return gaps.reduce((best, gap) => (gap[1] < best[1] ? gap : best))[0];
}

function textOf(
  snapshot: { nodes: readonly CanvasNode[]; edges: readonly ConnectorEdge[] },
  id: string,
): string | null {
  const node = snapshot.nodes.find((entry) => entry.id === id);
  if (node?.type === "note" || node?.type === "text" || node?.type === "figure")
    return node.data.text;
  const edge = snapshot.edges.find((entry) => entry.id === id);
  return edge ? (edge.data?.label ?? "") : null;
}

interface BoardProps {
  canvas: Canvas;
}

export function Board({ canvas }: BoardProps) {
  const flow = useReactFlow<CanvasNode, ConnectorEdge>();
  const wrapper = useRef<HTMLDivElement>(null);
  const [nodes, setNodes] = useState<CanvasNode[]>(() =>
    canvas.items.map(toNode),
  );
  const [edges, setEdges] = useState<ConnectorEdge[]>(() =>
    canvas.connectors.map(toEdge),
  );
  const [tool, setTool] = useState<CanvasTool>("select");
  const [color, setColor] = useState<CanvasColor>("yellow");
  const [outline, setOutline] = useState<CanvasOutline>("rectangle");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [savesReady, setSavesReady] = useState(false);
  const [history] = useState(() => createHistory());

  const latest = useRef({ nodes, edges });
  latest.current = { nodes, edges };
  const viewport = useRef<Viewport>(canvas.viewport);
  const editStart = useRef<{ id: string; snapshot: CanvasSnapshot } | null>(
    null,
  );
  const ownsSelection = useRef(false);

  const current = useCallback(
    () => snapshotOf(latest.current.nodes, latest.current.edges),
    [],
  );
  const record = useCallback(
    () => history.record(current()),
    [current, history],
  );

  const restore = useCallback((snapshot: CanvasSnapshot) => {
    setEditingId(null);
    editStart.current = null;
    setNodes(snapshot.items.map(toNode));
    setEdges(snapshot.connectors.map(toEdge));
  }, []);

  const insert = useCallback(
    (
      items: CanvasItem[],
      options?: { edit?: boolean; connectors?: CanvasConnector[] },
    ) => {
      if (!items.length) return;
      record();
      const added = new Set(items.map((item) => item.id));
      setNodes((existing) => [
        ...existing.map((node) => ({ ...node, selected: false })),
        ...items.map((item) => ({ ...toNode(item), selected: true })),
      ]);
      setEdges((existing) => [
        ...existing.map((edge) => ({ ...edge, selected: false })),
        ...(options?.connectors ?? []).map(toEdge),
      ]);
      const first = items[0];
      if (options?.edit && first && added.size === 1) {
        editStart.current = null;
        setEditingId(first.id);
      }
    },
    [record],
  );

  const viewCenter = useCallback((): XYPosition => {
    const bounds = wrapper.current?.getBoundingClientRect();
    if (!bounds) return { x: 0, y: 0 };
    return flow.screenToFlowPosition({
      x: bounds.left + bounds.width / 2,
      y: bounds.top + bounds.height / 2,
    });
  }, [flow]);

  const addSaves = useCallback(
    (saveIds: readonly string[], at?: XYPosition) => {
      const onBoard = new Set(
        latest.current.nodes.flatMap((node) =>
          node.type === "save" ? [node.data.saveId] : [],
        ),
      );
      const fresh = [...new Set(saveIds)].filter((id) => !onBoard.has(id));
      if (!fresh.length) {
        const wanted = new Set(saveIds);
        setNodes((existing) =>
          existing.map((node) => ({
            ...node,
            selected: node.type === "save" && wanted.has(node.data.saveId),
          })),
        );
        return;
      }
      insert(placeSaves(fresh, at ?? viewCenter()));
    },
    [insert, viewCenter],
  );

  useEffect(
    () =>
      claimUndo({
        undo: () => {
          const previous = history.undo(current());
          if (previous) restore(previous);
        },
        redo: () => {
          const next = history.redo(current());
          if (next) restore(next);
        },
      }),
    [current, history, restore],
  );

  useEffect(
    () => canvases.attachBoard({ id: canvas.id, addSaves }),
    [addSaves, canvas.id],
  );

  const saveIdsKey = useMemo(
    () =>
      [
        ...new Set(
          nodes.flatMap((node) =>
            node.type === "save" ? [node.data.saveId] : [],
          ),
        ),
      ]
        .sort()
        .join("\n"),
    [nodes],
  );

  useEffect(() => {
    let live = true;
    void (async () => {
      try {
        await ensureSaves(saveIdsKey ? saveIdsKey.split("\n") : []);
      } finally {
        if (live) setSavesReady(true);
      }
    })();
    return () => {
      live = false;
    };
  }, [saveIdsKey]);

  const [initialContent] = useState(() =>
    JSON.stringify(contentOf(nodes, edges, canvas.viewport)),
  );
  const lastSaved = useRef(initialContent);
  const save = useCallback(
    (content: CanvasContent) => {
      const serialized = JSON.stringify(content);
      if (serialized === lastSaved.current) return;
      lastSaved.current = serialized;
      void (async () => {
        try {
          await canvases.persist(canvas.id, content);
        } catch (error) {
          lastSaved.current = "";
          notify({
            id: "canvas-save",
            title: "Couldn't save the canvas",
            description: errorCopy(error, "Your next change retries the save."),
          });
        }
      })();
    },
    [canvas.id],
  );
  const flush = useCallback(
    () =>
      save(
        contentOf(latest.current.nodes, latest.current.edges, viewport.current),
      ),
    [save],
  );

  useEffect(() => {
    const handle = window.setTimeout(
      () => save(contentOf(nodes, edges, viewport.current)),
      SAVE_DELAY_MS,
    );
    return () => window.clearTimeout(handle);
  }, [edges, nodes, save]);

  useEffect(() => () => flush(), [flush]);

  const onNodesChange = useCallback(
    (changes: NodeChange<CanvasNode>[]) =>
      setNodes((existing) => applyNodeChanges(changes, existing)),
    [],
  );
  const onEdgesChange = useCallback(
    (changes: EdgeChange<ConnectorEdge>[]) =>
      setEdges((existing) => applyEdgeChanges(changes, existing)),
    [],
  );
  const onConnect = useCallback(
    (connection: Connection) => {
      record();
      setEdges((existing) =>
        addEdge(
          {
            ...connection,
            id: newId(),
            type: "connector",
            data: CONNECTOR_STYLE,
          },
          existing,
        ),
      );
    },
    [record],
  );

  /** React Flow only connects on a handle; dropping anywhere on another item should link to its nearest side. */
  const onConnectEnd = useCallback<OnConnectEnd>(
    (event, state) => {
      setConnecting(false);
      if (state.isValid || !state.fromNode || !state.fromHandle) return;
      const pointer =
        "changedTouches" in event ? event.changedTouches[0] : event;
      if (!pointer) return;
      const point = flow.screenToFlowPosition(
        { x: pointer.clientX, y: pointer.clientY },
        { snapToGrid: false },
      );
      const fromId = state.fromNode.id;
      const target = flow
        .getIntersectingNodes({ x: point.x, y: point.y, width: 1, height: 1 })
        .findLast((node) => node.id !== fromId);
      if (!target) return;
      const bounds = flow.getNodesBounds([target]);
      onConnect({
        source: fromId,
        sourceHandle: state.fromHandle.id ?? null,
        target: target.id,
        targetHandle: nearestSide(bounds, point),
      });
    },
    [flow, onConnect],
  );

  const onSelectionChange = useCallback(
    ({ nodes: picked }: OnSelectionChangeParams<CanvasNode>) => {
      const saveIds = picked.flatMap((node) =>
        node.type === "save" ? [node.data.saveId] : [],
      );
      if (saveIds.length) {
        ownsSelection.current = true;
        selection.set(saveIds);
        primarySelection.set(saveIds[0] ?? null);
        return;
      }
      if (!ownsSelection.current) return;
      ownsSelection.current = false;
      selection.clear();
      primarySelection.set(null);
    },
    [],
  );

  const onStroke = useCallback(
    (points: StrokePoint[], size: number) => {
      const drawing = drawingFrom(points, color, size);
      if (drawing) insert([drawing]);
    },
    [color, insert],
  );

  const recolor = (next: CanvasColor) => {
    const recolors = latest.current.nodes.some(
      (node) =>
        node.selected &&
        (node.type === "note" ||
          node.type === "drawing" ||
          node.type === "figure") &&
        node.data.color !== next,
    );
    if (!recolors) return;
    record();
    setNodes((existing) => existing.map((node) => withColor(node, next)));
  };

  const changeOutline = (next: CanvasOutline) => {
    const reoutlines = latest.current.nodes.some(
      (node) =>
        node.selected && node.type === "figure" && node.data.outline !== next,
    );
    if (!reoutlines) return;
    record();
    setNodes((existing) =>
      existing.map((node) =>
        node.selected && node.type === "figure"
          ? { ...node, data: { ...node.data, outline: next } }
          : node,
      ),
    );
  };

  const selected = nodes.filter((node) => node.selected);
  const [only] = selected;
  const selectedEdges = edges.filter((edge) => edge.selected);
  const connectorBarId =
    tool === "select" && !selected.length
      ? (selectedEdges.at(-1)?.id ?? null)
      : null;

  const actions = useMemo<BoardActions>(
    () => ({
      editingId,
      savesReady,
      connectorBarId,
      barsHidden: dragging,
      record,
      setText: (id, text) => {
        setNodes((existing) =>
          existing.map((node) => withText(node, id, text)),
        );
        setEdges((existing) =>
          existing.map((edge) =>
            edge.id === id
              ? {
                  ...edge,
                  data: { ...CONNECTOR_STYLE, ...edge.data, label: text },
                }
              : edge,
          ),
        );
      },
      startEditing: (id) => {
        editStart.current = { id, snapshot: current() };
        setEditingId(id);
      },
      finishEditing: () => {
        const start = editStart.current;
        editStart.current = null;
        setEditingId(null);
        if (!start) return;
        const item = start.snapshot.items.find(
          (entry) => entry.id === start.id,
        );
        const connector = start.snapshot.connectors.find(
          (entry) => entry.id === start.id,
        );
        const beforeText =
          item && "text" in item
            ? item.text
            : connector
              ? connector.label
              : null;
        if (beforeText !== textOf(latest.current, start.id))
          history.record(start.snapshot);
      },
      restyle: (patch: Partial<ConnectorStyle>) => {
        record();
        setEdges((existing) =>
          existing.map((edge) =>
            edge.selected
              ? {
                  ...edge,
                  data: { ...CONNECTOR_STYLE, ...edge.data, ...patch },
                }
              : edge,
          ),
        );
      },
      deleteConnectors: () =>
        void flow.deleteElements({
          edges: latest.current.edges.filter((edge) => edge.selected),
        }),
    }),
    [
      connectorBarId,
      current,
      dragging,
      editingId,
      flow,
      history,
      record,
      savesReady,
    ],
  );

  const duplicate = () => {
    const picked = new Set(
      latest.current.nodes.flatMap((node) => (node.selected ? [node.id] : [])),
    );
    const copy = duplicateOf(current(), picked);
    insert(copy.items, { connectors: copy.connectors });
  };

  const openable =
    selected.length === 1 && only?.type === "save" && pool.get(only.data.saveId)
      ? only.data.saveId
      : null;
  const showColors = tool === "note" || tool === "pen" || tool === "figure";
  const onCanvas = useMemo(
    () => new Set(saveIdsKey ? saveIdsKey.split("\n") : []),
    [saveIdsKey],
  );

  return (
    <BoardContext.Provider value={actions}>
      <div
        ref={wrapper}
        className={styles.board}
        role="application"
        aria-label={canvas.name}
        aria-roledescription="canvas"
        data-tool={tool}
        data-connecting={connecting || undefined}
        tabIndex={-1}
        onKeyDown={(event) => {
          if (isEditableTarget(event.target)) return;
          if (event.metaKey || event.ctrlKey || event.altKey) {
            const key = event.key.toLowerCase();
            if (key === "a" && !event.altKey) {
              event.preventDefault();
              setNodes((existing) =>
                existing.map((node) => ({ ...node, selected: true })),
              );
            } else if (key === "d" && !event.altKey) {
              event.preventDefault();
              duplicate();
            }
            return;
          }
          if (event.key === "Enter" && selected.length === 1 && only) {
            event.preventDefault();
            if (openable) openSave(openable);
            else if (hasText(only)) actions.startEditing(only.id);
            return;
          }
          if (event.key === "Enter" && connectorBarId) {
            event.preventDefault();
            actions.startEditing(connectorBarId);
            return;
          }
          if (event.shiftKey && event.code === "Digit1") {
            event.preventDefault();
            void flow.fitView({ duration: 200, padding: 0.2 });
            return;
          }
          if (event.key === "Escape") {
            setTool("select");
            return;
          }
          const next = event.shiftKey ? undefined : toolForKey(event.key);
          if (next) {
            event.preventDefault();
            setTool(next);
          }
        }}
        onDragOver={(event) => {
          if (!isLibrarySaveDrag(event.dataTransfer)) return;
          event.preventDefault();
          event.stopPropagation();
          event.dataTransfer.dropEffect = "copy";
        }}
        onDrop={(event) => {
          if (!isLibrarySaveDrag(event.dataTransfer)) return;
          event.preventDefault();
          event.stopPropagation();
          addSaves(
            saveDropIds(event.dataTransfer),
            flow.screenToFlowPosition({ x: event.clientX, y: event.clientY }),
          );
        }}
      >
        <ReactFlow<CanvasNode, ConnectorEdge>
          nodes={nodes}
          edges={edges}
          nodeTypes={NODE_TYPES}
          edgeTypes={EDGE_TYPES}
          defaultViewport={canvas.viewport}
          minZoom={0.05}
          maxZoom={8}
          connectionMode={ConnectionMode.Loose}
          connectionRadius={40}
          snapToGrid
          snapGrid={SNAP_GRID}
          deleteKeyCode={["Backspace", "Delete"]}
          multiSelectionKeyCode={["Meta", "Shift"]}
          selectionMode={SelectionMode.Partial}
          selectionOnDrag={tool === "select"}
          panOnDrag={
            tool === "hand" ? true : tool === "select" ? [1, 2] : false
          }
          panOnScroll
          elementsSelectable={tool !== "pen" && tool !== "hand"}
          nodesDraggable={tool === "select"}
          nodesConnectable={tool === "select"}
          proOptions={{ hideAttribution: true }}
          isValidConnection={(connection) =>
            connection.source !== connection.target
          }
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onConnectStart={() => setConnecting(true)}
          onConnectEnd={onConnectEnd}
          onSelectionChange={onSelectionChange}
          onNodeDragStart={() => {
            record();
            setDragging(true);
          }}
          onSelectionDragStart={() => {
            record();
            setDragging(true);
          }}
          onNodeDragStop={() => setDragging(false)}
          onSelectionDragStop={() => setDragging(false)}
          onBeforeDelete={async () => {
            record();
            return true;
          }}
          onMoveEnd={(_, next) => {
            viewport.current = next;
            flush();
          }}
          onNodeDoubleClick={(_, node) => {
            if (tool !== "select") return;
            if (node.type === "save") {
              if (pool.get(node.data.saveId)) openSave(node.data.saveId);
            } else if (hasText(node)) actions.startEditing(node.id);
          }}
          onEdgeDoubleClick={(_, edge) => {
            if (tool === "select") actions.startEditing(edge.id);
          }}
          onPaneClick={(event) => {
            if (tool !== "note" && tool !== "text" && tool !== "figure") return;
            const point = flow.screenToFlowPosition({
              x: event.clientX,
              y: event.clientY,
            });
            const item =
              tool === "note"
                ? noteAt(point, color)
                : tool === "figure"
                  ? figureAt(point, outline, color)
                  : textAt(point);
            insert([item], { edit: true });
            setTool("select");
          }}
        >
          <Background
            variant={BackgroundVariant.Dots}
            gap={GRID}
            size={1.5}
            className={styles.dots}
          />
          {tool === "pen" ? (
            <DrawLayer color={color} size={PEN_SIZE} onStroke={onStroke} />
          ) : null}
          <SelectionBar
            nodes={tool === "select" ? selected : []}
            hidden={dragging}
            canOpen={openable !== null}
            onColor={recolor}
            onOutline={changeOutline}
            onOpen={() => {
              if (openable) openSave(openable);
            }}
            onDuplicate={duplicate}
            onDelete={() => void flow.deleteElements({ nodes: selected })}
          />
        </ReactFlow>
        <Tools
          tool={tool}
          color={color}
          outline={outline}
          showColors={showColors}
          showOutlines={tool === "figure"}
          onCanvas={onCanvas}
          onTool={setTool}
          onColor={setColor}
          onOutline={setOutline}
          onAddSaves={(saveIds) => addSaves(saveIds)}
        />
        <Zoom />
      </div>
    </BoardContext.Provider>
  );
}
