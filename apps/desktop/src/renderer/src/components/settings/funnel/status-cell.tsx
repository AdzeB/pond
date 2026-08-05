import type { QueueRow } from "./lib/queue";
import styles from "./status-cell.module.css";

export function StatusCell({ row }: { row: QueueRow }) {
  if (row.status === "saving") {
    return (
      <span
        className={styles.status}
        data-status="saving"
        title={row.stage ?? "Queued"}
      >
        Saving
      </span>
    );
  }
  if (row.status === "failed") {
    return (
      <span className={styles.status} data-status="failed">
        Failed
      </span>
    );
  }
  return (
    <span className={styles.status} data-status="saved">
      Saved
    </span>
  );
}
