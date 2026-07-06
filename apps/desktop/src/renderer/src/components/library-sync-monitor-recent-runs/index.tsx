import { IconChevronRightOutline18 as Chevron } from "@pond/icons/outline/18";
import { Toolbar } from "@pond/ui";
import { useMemo, useState } from "react";
import {
  dayBucket,
  describeRun,
  formatClock,
  formatRunDuration,
  prettyTrigger,
  runItems,
  runLabel,
  runTone,
  type SyncRun,
} from "@/components/library-sync-monitor/lib/helpers";
import { BrandTile } from "@/components/library-sync-monitor-source-tile";
import { useRecentRuns } from "@/hooks/use-recent-runs";
import { getSourceDef } from "@/lib/save/sources-registry";
import styles from "./styles.module.css";

type Filter = "all" | "errors" | "manual";

const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "errors", label: "Errors" },
  { id: "manual", label: "Manual" },
];

export function RecentRuns({
  onOpenRun,
}: {
  onOpenRun: (run: SyncRun) => void;
}) {
  const { runs, loading } = useRecentRuns(60);
  const [filter, setFilter] = useState<Filter>("all");

  const filtered = useMemo(() => {
    if (filter === "errors")
      return runs.filter((r) => runTone(r) === "err" || runTone(r) === "warn");
    if (filter === "manual")
      return runs.filter((r) => prettyTrigger(r.trigger) === "manual");
    return runs;
  }, [runs, filter]);

  // Preserve newest-first order while inserting day separators.
  const groups: { label: string; runs: SyncRun[] }[] = useMemo(() => {
    const out: { label: string; runs: SyncRun[] }[] = [];
    for (const run of filtered) {
      const label = dayBucket(run.ts);
      const last = out[out.length - 1];
      if (last && last.label === label) last.runs.push(run);
      else out.push({ label, runs: [run] });
    }
    return out;
  }, [filtered]);

  return (
    <div className={styles.runs}>
      <div className={styles["runs-header"]}>
        <Toolbar.Root className={styles.segmented}>
          <Toolbar.Group>
            {FILTERS.map(({ id, label }) => (
              <Toolbar.Button
                key={id}
                className={styles["segment-button"]}
                data-active={filter === id ? "" : undefined}
                onClick={() => setFilter(id)}
              >
                {label}
              </Toolbar.Button>
            ))}
          </Toolbar.Group>
        </Toolbar.Root>
      </div>

      <div className={styles["table-header"]}>
        <span>Status</span>
        <span>Source</span>
        <span>Result</span>
        <span className={styles["align-right"]}>Items</span>
        <span>Trigger</span>
        <span className={styles["align-right"]}>Duration · time</span>
        <span />
      </div>

      {loading ? (
        <div className={styles.empty}>Loading run history…</div>
      ) : filtered.length === 0 ? (
        <div className={styles.empty}>No runs recorded yet.</div>
      ) : (
        groups.map((group) => (
          <div key={group.label}>
            <div className={styles["day-group"]}>{group.label}</div>
            {group.runs.map((run) => {
              const tone = runTone(run);
              const items = runItems(run);
              return (
                <button
                  key={run.id}
                  type="button"
                  className={styles["run-row"]}
                  onClick={() => onOpenRun(run)}
                >
                  <span className={`${styles["run-outcome"]} ${styles[tone]}`}>
                    <span className={styles["outcome-dot"]} />
                    {runLabel(run)}
                  </span>
                  <span className={styles.source}>
                    <BrandTile source={run.source} size={22} />
                    <span className={styles["source-name"]}>
                      {getSourceDef(run.source).label}
                    </span>
                  </span>
                  <span className={styles["run-message"]}>
                    {describeRun(run)}
                  </span>
                  <span className={styles["run-items"]}>
                    {items === null ? "—" : <b>{items}</b>}
                  </span>
                  <span className={styles["run-trigger"]}>
                    {prettyTrigger(run.trigger)}
                  </span>
                  <span className={styles["run-time"]}>
                    {formatRunDuration(run.durationMs)} · {formatClock(run.ts)}
                  </span>
                  <Chevron className={styles.chevron} width={16} height={16} />
                </button>
              );
            })}
          </div>
        ))
      )}
    </div>
  );
}
