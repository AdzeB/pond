import { cssVars } from "@pond/ui";
import type { CanvasOutline } from "@shared/canvas-contracts";
import { type NodeProps, NodeResizer } from "@xyflow/react";
import { FIGURE_EDGE, NOTE_FILL } from "../../lib/colors";
import type { FigureNode } from "../../lib/document";
import { useBoard } from "../board/context";
import { EditableText } from "../editable-text";
import { Handles } from "../handles";
import styles from "./styles.module.css";

function polygonOf(outline: CanvasOutline): string | null {
  if (outline === "diamond") return "50,0 100,50 50,100 0,50";
  if (outline === "triangle") return "50,0 100,100 0,100";
  return null;
}

export function FigureItem({ id, data, selected }: NodeProps<FigureNode>) {
  const board = useBoard();
  const polygon = polygonOf(data.outline);
  return (
    <div
      className={styles.figure}
      data-outline={data.outline}
      data-selected={selected || undefined}
      style={cssVars({
        "--figure-fill": NOTE_FILL[data.color],
        "--figure-edge": FIGURE_EDGE[data.color],
      })}
    >
      {polygon ? (
        <svg
          className={styles.outline}
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          aria-hidden
        >
          <polygon points={polygon} />
        </svg>
      ) : null}
      <NodeResizer
        isVisible={selected && board.editingId !== id}
        minWidth={48}
        minHeight={48}
        onResizeStart={board.record}
      />
      <Handles />
      <EditableText
        id={id}
        text={data.text}
        label="Shape"
        placeholder="Add text"
        hint=""
        variant="figure"
      />
    </div>
  );
}
