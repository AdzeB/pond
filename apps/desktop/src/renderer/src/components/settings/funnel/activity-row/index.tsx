import { relativeTimeFromMs } from "@/lib/util/relative-time";
import type { ActivityEntry } from "@/stores/activity";
import styles from "./styles.module.css";

export function ActivityRow({ entry }: { entry: ActivityEntry }) {
  return (
    <li className={styles.row} data-status={entry.state}>
      <span className={styles["row-main"]}>
        <span
          className={styles["activity-dot"]}
          data-state={entry.state}
          aria-hidden
        />
        <span className={styles["row-title"]}>{entry.label}</span>
        <span
          className={styles["row-sub"]}
          data-tone={entry.state === "error" ? "error" : undefined}
        >
          {entry.state === "error"
            ? (entry.message ?? "Failed")
            : entry.message}
        </span>
      </span>
      <span className={styles["row-end"]}>
        {entry.state === "running" ? (
          <span className={styles.pct}>Running…</span>
        ) : (
          <span className={styles.when}>
            {relativeTimeFromMs(entry.endedAt ?? entry.startedAt, "")}
          </span>
        )}
      </span>
    </li>
  );
}
