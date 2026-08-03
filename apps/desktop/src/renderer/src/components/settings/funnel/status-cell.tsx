import { humanizeError, type QueueRow } from "./lib/queue";
import styles from "./status-cell.module.css";

export function StatusCell({ row }: { row: QueueRow }) {
  if (row.status === "saving") {
    return (
      <span
        className={styles.status}
        data-status="saving"
        title={row.stage ?? "Queued"}
      >
        <span className={styles.dot} aria-hidden />
        {Math.round(row.progress * 100)}%
        <span className={styles.bar} aria-hidden>
          <span
            className={styles["bar-fill"]}
            style={{ transform: `scaleX(${row.progress})` }}
          />
        </span>
      </span>
    );
  }
  if (row.status === "failed") {
    return (
      <span
        className={styles.status}
        data-status="failed"
        title={humanizeError(row.error)}
      >
        <span className={styles.dot} aria-hidden />
        Failed
      </span>
    );
  }
  return (
    <span className={styles.status} data-status="saved">
      <span className={styles.dot} aria-hidden />
      Saved
    </span>
  );
}
