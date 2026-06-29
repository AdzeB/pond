import { DEFAULT_SOURCE_METRICS, type Source } from "@pond/schema/db";
import {
  METRIC_BY_ID,
  type MetricContext,
  type MetricDisplay,
} from "@/components/library-sync-monitor/lib/kpi-catalog";
import styles from "@/components/library-sync-monitor/styles.module.css";
import { useRecentRuns } from "@/hooks/use-recent-runs";
import { useSyncStats } from "@/hooks/use-sync-stats";
import { usePrefs } from "@/stores/prefs";
import { useStorageStatus } from "@/stores/storage-status";
import type { SyncSourceStatus } from "@/stores/sync-monitor";

export function KpiStrip({
  sources,
  bySource,
  onCustomize,
}: {
  sources: readonly Source[];
  bySource: Partial<Record<Source, SyncSourceStatus>>;
  onCustomize: () => void;
}) {
  const [view, patch] = usePrefs("sourcesView");
  const days = view.days ?? 7;
  const { stats } = useSyncStats(days);
  const { runs } = useRecentRuns(200);
  const storage = useStorageStatus();

  const ids = view.metrics ?? DEFAULT_SOURCE_METRICS;
  const displayOf = (id: string): MetricDisplay =>
    view.metricDisplay?.[id] ?? METRIC_BY_ID[id]?.defaultDisplay ?? "chip";

  const connectedCount = sources.filter(
    (s) => bySource[s]?.connected || bySource[s]?.state === "running",
  ).length;
  const healthyCount = sources.filter((s) => {
    const st = bySource[s];
    const ok = st?.connected || st?.state === "running";
    const bad = st?.state === "error" || st?.state === "auth_required";
    return ok && !bad;
  }).length;

  const ctx: MetricContext = {
    stats,
    recentRuns: runs,
    connectedCount,
    healthyCount,
    totalSources: sources.length,
    storage,
    days,
  };

  const cards = ids.filter(
    (id) => METRIC_BY_ID[id] && displayOf(id) === "card",
  );
  const chips = ids.filter(
    (id) => METRIC_BY_ID[id] && displayOf(id) === "chip",
  );

  const remove = (id: string) => {
    patch({ metrics: ids.filter((m) => m !== id) });
  };

  return (
    <>
      {cards.length > 0 ? (
        <div className={styles.kpis}>
          {cards.map((id) => {
            const def = METRIC_BY_ID[id];
            if (!def) return null;
            const m = def.compute(ctx);
            const dir = m.delta?.dir ?? "neutral";
            return (
              <div key={id} className={styles.kpi}>
                <button
                  type="button"
                  className={styles.kx}
                  aria-label={`Remove ${def.label}`}
                  onClick={() => remove(id)}
                >
                  ✕
                </button>
                <div className={styles.kLabel}>
                  {def.label}
                  {def.group === "Items" || def.group === "Sync"
                    ? ` · ${days}d`
                    : ""}
                </div>
                <div className={styles.kValue}>{m.value}</div>
                {m.delta ? (
                  <div
                    className={`${styles.kDelta} ${
                      dir === "up"
                        ? styles.up
                        : dir === "down"
                          ? styles.down
                          : styles.neu
                    }`}
                  >
                    {m.delta.text}
                  </div>
                ) : null}
                {m.spark ? (
                  <div className={styles.spark}>
                    {m.spark.map((h, i) => (
                      <i
                        // biome-ignore lint/suspicious/noArrayIndexKey: fixed-length sparkline
                        key={i}
                        className={
                          i === (m.spark?.length ?? 0) - 1
                            ? styles.hl
                            : undefined
                        }
                        style={{
                          height: `${Math.max(8, Math.round(h * 100))}%`,
                        }}
                      />
                    ))}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : null}

      <div className={styles.chiprail}>
        {chips.map((id) => {
          const def = METRIC_BY_ID[id];
          if (!def) return null;
          const m = def.compute(ctx);
          return (
            <span key={id} className={styles.statchip}>
              <span className={styles.cl}>{def.label}</span>
              <span
                className={`${styles.cv} ${
                  m.tone === "ok"
                    ? styles.ok
                    : m.tone === "err"
                      ? styles.err
                      : m.tone === "warn"
                        ? styles.warn
                        : ""
                }`}
              >
                {m.value}
              </span>
            </span>
          );
        })}
        <button
          type="button"
          className={`${styles.statchip} ${styles.addmetric}`}
          onClick={onCustomize}
        >
          + Add metric
        </button>
      </div>
    </>
  );
}
