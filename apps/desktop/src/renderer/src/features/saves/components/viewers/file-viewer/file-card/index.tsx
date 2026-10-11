import type { SaveFile } from "@/features/saves/types";
import { formatBytes } from "@/shared/lib/format";
import type { ViewerProps } from "../types";
import styles from "./styles.module.css";

export function GenericFileCard({
  message,
  ...props
}: ViewerProps & { message?: string }) {
  return (
    <div className={styles.card}>
      <FileMark file={props.file} />
      <div className={styles.heading}>
        <h1>{props.save.title ?? props.file.path}</h1>
        <p>{props.file.path}</p>
        <p>
          {props.file.mimeType || "File"} · {formatBytes(props.file.size)}
        </p>
        {message ? <p>{message}</p> : null}
      </div>
    </div>
  );
}

export function FileMark({ file }: { file: SaveFile }) {
  const dot = file.path.lastIndexOf(".");
  const label =
    dot >= 0 ? file.path.slice(dot + 1, dot + 13).toUpperCase() : "FILE";
  return <div className={styles.mark}>{label || "FILE"}</div>;
}
