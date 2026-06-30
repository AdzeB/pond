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
          <span className={styles.ii} aria-hidden>
            <CheckIcon width={18} height={18} />
          </span>
          <div className={styles.it}>
            <div className={styles.itn}>No background tasks</div>
            <div className={styles.its}>
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
    <div className={styles.mini}>
      <div className={styles.mt}>
        <div className={styles.mn}>
          {item.label}
          <span className={styles.typepill}>
            {paused ? "Paused" : "Active"}
          </span>
        </div>
        <div className={styles.mtrack}>
          {determinate ? (
            <div className={styles.fillbar} style={{ width: `${pct}%` }} />
          ) : paused ? null : (
            <div className={styles.indet} />
          )}
        </div>
        <div className={styles.ms}>
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
