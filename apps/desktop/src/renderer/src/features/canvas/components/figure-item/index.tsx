import { cssVars } from "@pond/ui";
import { type NodeProps, NodeResizer } from "@xyflow/react";
import { FIGURE_EDGE, NOTE_FILL } from "../../lib/colors";
import type { FigureNode } from "../../lib/document";
import { drawingOf } from "../../lib/outlines";
import { useBoard } from "../board/context";
import { EditableText } from "../editable-text";
import { Handles } from "../handles";
import styles from "./styles.module.css";

export function FigureItem({
  id,
  data,
  selected,
  draggable,
}: NodeProps<FigureNode>) {
  const board = useBoard();
  const drawing = drawingOf(data.outline);
  return (
    <div className={styles.bounds}>
      <NodeResizer
        isVisible={selected && draggable && board.editingId !== id}
        minWidth={48}
        minHeight={48}
        onResizeStart={board.record}
      />
      <Handles />
      <div
        className={styles.figure}
        data-outline={data.outline}
        data-drawn={drawing ? true : undefined}
        data-selected={selected || undefined}
        data-flip-x={data.flipX || undefined}
        data-flip-y={data.flipY || undefined}
        style={{
          ...cssVars({
            "--figure-fill": NOTE_FILL[data.color],
            "--figure-edge": FIGURE_EDGE[data.color],
          }),
          transform: data.rotation ? `rotate(${data.rotation}deg)` : undefined,
        }}
      >
        {drawing ? (
          <svg
            className={styles.outline}
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            aria-hidden
          >
            <path d={drawing.fill} />
            {drawing.details ? (
              <path className={styles.details} d={drawing.details} />
            ) : null}
          </svg>
        ) : null}
        <EditableText
          id={id}
          text={data.text}
          label="Shape"
          placeholder="Add text"
          hint=""
          variant="figure"
          style={data}
        />
      </div>
    </div>
  );
}
