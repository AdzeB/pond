import { IconTrash, IconTriangleWarning } from "@pond/icons";
import { domainFromUrl } from "@pond/schema/domain";
import { type NodeProps, NodeResizer } from "@xyflow/react";
import { CardThumb } from "@/features/saves";
import { useSave } from "@/features/saves/pool";
import type { SaveNode } from "../../lib/document";
import { useBoard } from "../board/context";
import { Handles } from "../handles";
import styles from "./styles.module.css";

export function SaveItem({ data, selected, width }: NodeProps<SaveNode>) {
  const board = useBoard();
  const save = useSave(data.saveId);
  const missing = !save && board.savesReady;
  const domain = save?.url ? domainFromUrl(save.url) : null;
  const title = save?.title?.trim() || domain || "Untitled";
  return (
    <div
      className={styles.card}
      data-selected={selected || undefined}
      data-missing={missing || undefined}
      data-trashed={save?.deletedAt ? true : undefined}
    >
      <NodeResizer
        isVisible={selected}
        minWidth={140}
        minHeight={120}
        onResizeStart={board.record}
      />
      <Handles />
      <div className={styles.media}>
        {save ? (
          <CardThumb save={save} view="grid" width={Math.round(width ?? 240)} />
        ) : missing ? (
          <span className={styles.status}>
            <IconTriangleWarning size={18} />
            Not in this library
          </span>
        ) : null}
      </div>
      <div className={styles.caption}>
        <span className={styles.title}>{missing ? "Missing Save" : title}</span>
        {save?.deletedAt ? (
          <span className={styles.meta}>
            <IconTrash size={12} />
            In Trash
          </span>
        ) : domain && domain !== title ? (
          <span className={styles.meta}>{domain}</span>
        ) : null}
      </div>
    </div>
  );
}
