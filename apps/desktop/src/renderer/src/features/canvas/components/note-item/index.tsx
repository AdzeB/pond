import { cssVars } from "@pond/ui";
import { type NodeProps, NodeResizer } from "@xyflow/react";
import { NOTE_FILL } from "../../lib/colors";
import type { NoteNode } from "../../lib/document";
import { useBoard } from "../board/context";
import { EditableText } from "../editable-text";
import { Handles } from "../handles";
import styles from "./styles.module.css";

export function NoteItem({
  id,
  data,
  selected,
  draggable,
}: NodeProps<NoteNode>) {
  const board = useBoard();
  return (
    <div
      className={styles.note}
      data-selected={selected || undefined}
      style={cssVars({ "--note-fill": NOTE_FILL[data.color] })}
    >
      <NodeResizer
        isVisible={selected && draggable && board.editingId !== id}
        minWidth={120}
        minHeight={80}
        onResizeStart={board.record}
      />
      <Handles />
      <EditableText
        id={id}
        text={data.text}
        label="Note"
        placeholder="Write a note"
        hint="Double-click to write"
        variant="note"
      />
    </div>
  );
}
