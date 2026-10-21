import { type NodeProps, NodeResizer } from "@xyflow/react";
import type { TextNode } from "../../lib/document";
import { useBoard } from "../board/context";
import { EditableText } from "../editable-text";
import { Handles } from "../handles";
import styles from "./styles.module.css";

export function TextItem({
  id,
  data,
  selected,
  draggable,
}: NodeProps<TextNode>) {
  const board = useBoard();
  return (
    <div className={styles.bounds}>
      <NodeResizer
        isVisible={selected && draggable && board.editingId !== id}
        minWidth={80}
        minHeight={32}
        onResizeStart={board.record}
      />
      <Handles onCreate={(side) => board.quickCreate(id, side)} />
      <div
        className={styles.text}
        data-selected={selected || undefined}
        style={
          data.rotation
            ? { transform: `rotate(${data.rotation}deg)` }
            : undefined
        }
      >
        <EditableText
          id={id}
          text={data.text}
          label="Text"
          placeholder="Type something"
          hint="Double-click to type"
          variant="text"
          style={data}
        />
      </div>
    </div>
  );
}
