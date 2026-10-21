import {
  IconAlign2Left,
  IconArrowUpRight,
  IconDuplicate,
  IconTrash,
} from "@pond/icons";
import type { MenuItemSpec } from "@pond/ui";
import type { CanvasColor } from "@shared/canvas-contracts";
import { NodeToolbar, Position } from "@xyflow/react";
import type { ReactElement } from "react";
import type { CanvasNode } from "../../lib/document";
import { Bar } from "../bar";

export interface SelectionMenu {
  label: string;
  icon: ReactElement;
  buildItems: () => MenuItemSpec[];
}

interface SelectionBarProps {
  nodes: readonly CanvasNode[];
  hidden: boolean;
  canOpen: boolean;
  arrange: (() => MenuItemSpec[]) | null;
  menus: readonly SelectionMenu[];
  onColor(color: CanvasColor): void;
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
  arrange,
  menus,
  onColor,
  onOpen,
  onDuplicate,
  onDelete,
}: SelectionBarProps) {
  const colors = nodes.flatMap((node) =>
    node.type === "save" || node.type === "text" || node.type === "code"
      ? []
      : [node.data.color],
  );
  const copyable = nodes.some((node) => node.type !== "save");
  return (
    <NodeToolbar
      nodeId={nodes.map((node) => node.id)}
      isVisible={nodes.length > 0}
      position={Position.Top}
      offset={28}
    >
      <Bar.Root hidden={hidden}>
        {menus.length ? (
          <Bar.Group aria-label="Style">
            {menus.map((menu) => (
              <Bar.Menu
                key={menu.label}
                label={menu.label}
                buildItems={menu.buildItems}
              >
                {menu.icon}
              </Bar.Menu>
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
          {arrange ? (
            <Bar.Menu label="Arrange" buildItems={arrange}>
              <IconAlign2Left />
            </Bar.Menu>
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
