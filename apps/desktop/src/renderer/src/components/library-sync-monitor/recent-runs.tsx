import { useMemo, useState } from "react";
import { useRecentRuns } from "@/hooks/use-recent-runs";
import { getSourceDef } from "@/lib/sources-registry";
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
} from "./helpers";
import { BrandTile } from "./source-tile";
import styles from "./styles.module.css";

type Filter = "all" | "errors" | "manual";

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
      <div className={styles.rh}>
        <h3>Run history</h3>
        <span className={styles.seg}>
          {(["all", "errors", "manual"] as Filter[]).map((f) => (
            <button
              key={f}
              type="button"
              className={filter === f ? styles.on : undefined}
              onClick={() => setFilter(f)}
            >
              {f === "all" ? "All" : f === "errors" ? "Errors" : "Manual"}
            </button>
          ))}
        </span>
      </div>

      <div className={styles.thd}>
        <span>Status</span>
        <span>Source</span>
        <span>Result</span>
        <span className={styles.r}>Items</span>
        <span>Trigger</span>
        <span className={styles.r}>Duration · time</span>
        <span />
      </div>

      {loading ? (
        <div className={styles.empty}>Loading run history…</div>
      ) : filtered.length === 0 ? (
        <div className={styles.empty}>No runs recorded yet.</div>
      ) : (
        groups.map((group) => (
          <div key={group.label}>
            <div className={styles.daygrp}>{group.label}</div>
            {group.runs.map((run) => {
              const tone = runTone(run);
              const items = runItems(run);
              return (
                <button
                  key={run.id}
                  type="button"
                  className={styles.rrow}
                  onClick={() => onOpenRun(run)}
                >
                  <span className={`${styles.rout} ${styles[tone]}`}>
                    <span className={styles.od} />
                    {runLabel(run)}
                  </span>
                  <span className={styles.src}>
                    <BrandTile source={run.source} size={22} />
                    <span className={styles.sn}>
                      {getSourceDef(run.source).label}
                    </span>
                  </span>
                  <span className={styles.rmsg}>{describeRun(run)}</span>
                  <span className={styles.ritems}>
                    {items === null ? "—" : <b>{items}</b>}
                  </span>
                  <span className={styles.rtrig}>
                    {prettyTrigger(run.trigger)}
                  </span>
                  <span className={styles.rt}>
                    {formatRunDuration(run.durationMs)} · {formatClock(run.ts)}
                  </span>
                  <span className={styles.chev}>›</span>
                </button>
              );
            })}
          </div>
        ))
      )}
    </div>
  );
}
