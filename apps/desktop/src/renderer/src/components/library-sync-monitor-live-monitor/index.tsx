import { IconCircleCheckOutline18 as CheckIcon } from "@pond/icons/outline/18";
import { Button } from "@pond/ui";
import type { ProcessItem } from "@/components/library-sync-monitor/lib/use-active-processes";
import styles from "./styles.module.css";

// Activity = non-sync background processes (ingest, refresh, enrichment, …).
// Running source syncs surface their progress inline in the sources list, so
// the monitor no longer renders per-source rows or the stage diagram.
export function LiveMonitor({ processes }: { processes: ProcessItem[] }) {
  if (processes.length === 0) {
    return (
      <div className={styles.monitor}>
        <div className={styles.idle}>
          <span className={styles["idle-icon"]} aria-hidden>
            <CheckIcon width={18} height={18} />
          </span>
          <div className={styles["idle-text"]}>
            <div className={styles["idle-title"]}>No background tasks</div>
            <div className={styles["idle-subtitle"]}>
              Running syncs show their progress in the list above.
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.monitor}>
      {processes.map((p) => (
        <ProcessRow key={p.id} item={p} />
      ))}
    </div>
  );
}

function ProcessRow({ item }: { item: ProcessItem }) {
  const progress = item.progress;
  const determinate = !!progress?.total;
  const pct =
    determinate && progress
      ? Math.min(100, Math.round((progress.current / progress.total) * 100))
      : 0;
  const paused = item.state === "paused";

  return (
    <div className={styles["process-row"]}>
      <div className={styles["process-main"]}>
        <div className={styles["process-name"]}>
          {item.label}
          <span className={styles["type-pill"]}>
            {paused ? "Paused" : "Active"}
          </span>
        </div>
        <div className={styles["progress-track"]}>
          {determinate ? (
            <div
              className={styles["progress-fill"]}
              style={{ width: `${pct}%` }}
            />
          ) : paused ? null : (
            <div className={styles["progress-indeterminate"]} />
          )}
        </div>
        <div className={styles["process-status"]}>
          {item.message ?? (paused ? "Paused" : "Working…")}
          {determinate && progress
            ? ` · ${progress.current} / ${progress.total}`
            : ""}
        </div>
      </div>
      {item.onPause ? (
        <Button size="sm" variant="secondary" onClick={item.onPause}>
          {paused ? "Resume" : "Pause"}
        </Button>
      ) : null}
      {item.onCancel ? (
        <Button size="sm" variant="secondary" onClick={item.onCancel}>
          {item.kind === "ingest" ? "Stop all" : "Cancel"}
        </Button>
      ) : null}
    </div>
  );
}
