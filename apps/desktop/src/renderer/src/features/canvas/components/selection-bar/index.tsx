import { IconArrowUpRight, IconDuplicate, IconTrash } from "@pond/icons";
import type { CanvasColor, CanvasOutline } from "@shared/canvas-contracts";
import { NodeToolbar, Position } from "@xyflow/react";
import type { CanvasNode } from "../../lib/document";
import { OUTLINES } from "../../lib/outlines";
import { Bar } from "../bar";

interface SelectionBarProps {
  nodes: readonly CanvasNode[];
  hidden: boolean;
  canOpen: boolean;
  onColor(color: CanvasColor): void;
  onOutline(outline: CanvasOutline): void;
  onOpen(): void;
  onDuplicate(): void;
  onDelete(): void;
}

function shared<Value>(values: readonly Value[]): Value | null {
  const unique = new Set(values);
  const [only] = unique;
  return unique.size === 1 && only !== undefined ? only : null;
}

export function SelectionBar({
  nodes,
  hidden,
  canOpen,
  onColor,
  onOutline,
  onOpen,
  onDuplicate,
  onDelete,
}: SelectionBarProps) {
  const colors = nodes.flatMap((node) =>
    node.type === "note" || node.type === "drawing" || node.type === "figure"
      ? [node.data.color]
      : [],
  );
  const outlines = nodes.flatMap((node) =>
    node.type === "figure" ? [node.data.outline] : [],
  );
  const currentOutline = shared(outlines);
  const copyable = nodes.some((node) => node.type !== "save");
  return (
    <NodeToolbar
      nodeId={nodes.map((node) => node.id)}
      isVisible={nodes.length > 0}
      position={Position.Top}
      offset={28}
    >
      <Bar.Root hidden={hidden}>
        {outlines.length ? (
          <Bar.Group aria-label="Shape">
            {OUTLINES.map(({ outline, label, Icon }) => (
              <Bar.Action
                key={outline}
                label={label}
                pressed={currentOutline === outline}
                onClick={() => onOutline(outline)}
              >
                <Icon />
              </Bar.Action>
            ))}
          </Bar.Group>
        ) : null}
        {colors.length ? (
          <Bar.Colors value={shared(colors)} onChange={onColor} />
        ) : null}
        <Bar.Group aria-label="Actions">
          {canOpen ? (
            <Bar.Action label="Open Save" shortcut={["↵"]} onClick={onOpen}>
              <IconArrowUpRight />
            </Bar.Action>
          ) : null}
          {copyable ? (
            <Bar.Action
              label="Duplicate"
              shortcut={["⌘", "D"]}
              onClick={onDuplicate}
            >
              <IconDuplicate />
            </Bar.Action>
          ) : null}
          <Bar.Action label="Delete" shortcut={["⌫"]} onClick={onDelete}>
            <IconTrash />
          </Bar.Action>
        </Bar.Group>
      </Bar.Root>
    </NodeToolbar>
  );
}
