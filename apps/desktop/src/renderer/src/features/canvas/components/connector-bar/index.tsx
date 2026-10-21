import {
  IconArrowLeft,
  IconArrowRight,
  IconLineCurved,
  IconLineDashed,
  IconLineElbow,
  IconLineStraight,
  IconText,
  IconTrash,
} from "@pond/icons";
import type { CanvasLine } from "@shared/canvas-contracts";
import { useStore, ViewportPortal } from "@xyflow/react";
import type { ComponentType } from "react";
import { capItems } from "../../lib/board-menu";
import { type ConnectorStyle, capsOf, withCap } from "../../lib/document";
import { Bar } from "../bar";
import { useBoard } from "../board/context";
import styles from "./styles.module.css";

const LINES: readonly {
  line: CanvasLine;
  label: string;
  Icon: ComponentType;
}[] = [
  { line: "curved", label: "Curved", Icon: IconLineCurved },
  { line: "elbow", label: "Elbow", Icon: IconLineElbow },
  { line: "straight", label: "Straight", Icon: IconLineStraight },
];

interface ConnectorBarProps {
  id: string;
  x: number;
  y: number;
  style: ConnectorStyle;
}

export function ConnectorBar({ id, x, y, style }: ConnectorBarProps) {
  const board = useBoard();
  const zoom = useStore((state) => state.transform[2]);
  const caps = capsOf(style);
  return (
    <ViewportPortal>
      <div
        className={styles.anchor}
        style={{
          transform: `translate(${x}px, ${y}px) scale(${1 / zoom}) translate(-50%, calc(-100% - 28px))`,
        }}
      >
        <Bar.Root className="nodrag nopan" hidden={board.barsHidden}>
          <Bar.Group aria-label="Line">
            {LINES.map(({ line, label, Icon }) => (
              <Bar.Action
                key={line}
                label={label}
                pressed={style.line === line}
                onClick={() => board.restyle({ line })}
              >
                <Icon />
              </Bar.Action>
            ))}
          </Bar.Group>
          <Bar.Group aria-label="Ends">
            <Bar.Menu
              label="Start"
              buildItems={() =>
                capItems(caps.start, (cap) =>
                  board.restyle(withCap("start", cap)),
                )
              }
            >
              <IconArrowLeft />
            </Bar.Menu>
            <Bar.Menu
              label="End"
              buildItems={() =>
                capItems(caps.end, (cap) => board.restyle(withCap("end", cap)))
              }
            >
              <IconArrowRight />
            </Bar.Menu>
            <Bar.Action
              label="Dashed"
              pressed={style.dashed}
              onClick={() => board.restyle({ dashed: !style.dashed })}
            >
              <IconLineDashed />
            </Bar.Action>
          </Bar.Group>
          <Bar.Colors
            value={style.color}
            onChange={(color) => board.restyle({ color })}
          />
          <Bar.Group aria-label="Actions">
            <Bar.Action
              label={style.label ? "Edit Label" : "Add Label"}
              shortcut={["↵"]}
              onClick={() => board.startEditing(id)}
            >
              <IconText />
            </Bar.Action>
            <Bar.Action
              label="Delete"
              shortcut={["⌫"]}
              onClick={board.deleteConnectors}
            >
              <IconTrash />
            </Bar.Action>
          </Bar.Group>
        </Bar.Root>
      </div>
    </ViewportPortal>
  );
}
