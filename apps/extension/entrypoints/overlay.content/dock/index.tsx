import { IconArrowDownToLine, IconFolderFill } from "@pond/icons";
import { type DragEvent, useEffect, useEffectEvent, useState } from "react";
import type { DragItem, Folder, OverlayResult } from "@/utils/messaging";
import styles from "./styles.module.css";

interface DockProps {
  item: DragItem;
  folders: Folder[];
  onFinish: (result: OverlayResult | null) => void;
}

export function Dock({ item, folders, onFinish }: DockProps) {
  const [over, setOver] = useState<string | null>(null);
  const close = useEffectEvent(() => onFinish(null));

  /** A drag fires no mouse moves, so the first one means the drag ended somewhere else. */
  useEffect(() => {
    const end = () => setTimeout(close, 0);
    window.addEventListener("dragend", end, true);
    window.addEventListener("mousemove", end, true);
    return () => {
      window.removeEventListener("dragend", end, true);
      window.removeEventListener("mousemove", end, true);
    };
  }, []);

  const target = (key: string, folderId: string | null) => ({
    "data-over": over === key || undefined,
    onDragEnter: (event: DragEvent) => {
      event.preventDefault();
      setOver(key);
    },
    onDragOver: (event: DragEvent) => {
      event.preventDefault();
      event.dataTransfer.dropEffect = "copy";
    },
    onDragLeave: () => setOver((current) => (current === key ? null : current)),
    onDrop: (event: DragEvent) => {
      event.preventDefault();
      event.stopPropagation();
      onFinish({ kind: "drop", item, folderId });
    },
  });

  return (
    <section className={styles.dock} aria-label="Drop to save">
      <div className={styles.target} {...target("pond", null)}>
        <IconArrowDownToLine size={16} />
        <span className={styles.label}>
          {item.kind === "media" ? "Drop to Save Image" : "Drop to Save Link"}
        </span>
      </div>
      {folders.map((folder) => (
        <div
          key={folder.id}
          className={styles.target}
          {...target(folder.id, folder.id)}
        >
          <IconFolderFill size={16} />
          <span className={styles.label}>{folder.name}</span>
        </div>
      ))}
    </section>
  );
}
