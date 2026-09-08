import type { FileMessagePartProps } from "@assistant-ui/react";
import styles from "./styles.module.css";

export function FilePart({ filename, mimeType }: FileMessagePartProps) {
  return (
    <div className={styles.attachment}>
      <span>{filename || "Attachment"}</span>
      <span className={styles.muted}>{mimeType}</span>
    </div>
  );
}
