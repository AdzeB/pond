import {
  IconPlusOutline18 as Plus,
  IconXmarkOutline18 as Xmark,
} from "@pond/icons/outline/18";
import { DEFAULT_SOURCE_METRICS, type Source } from "@pond/schema/db";
import { Button } from "@pond/ui";
import {
  METRIC_BY_ID,
  type MetricContext,
  type MetricDisplay,
} from "@/components/library-sync-monitor/lib/kpi-catalog";
import { useRecentRuns } from "@/hooks/use-recent-runs";
import { useSyncStats } from "@/hooks/use-sync-stats";
import { usePrefs } from "@/stores/prefs";
import { useStorageStatus } from "@/stores/storage-status";
import type { SyncSourceStatus } from "@/stores/sync-monitor";
import styles from "./styles.module.css";

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
  // Default to the quiet chip rail; the larger KPI cards are opt-in per metric
  // via Customize (metricDisplay), so the page stays calm out of the box.
  const displayOf = (id: string): MetricDisplay =>
    view.metricDisplay?.[id] ?? "chip";

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
                <Button
                  icon
                  size="xs"
                  variant="ghost"
                  className={styles["kpi-remove"]}
                  aria-label={`Remove ${def.label}`}
                  onClick={() => remove(id)}
                >
                  <Xmark width={14} height={14} />
                </Button>
                <div className={styles["kpi-label"]}>
                  {def.label}
                  {def.group === "Items" || def.group === "Sync"
                    ? ` · ${days}d`
                    : ""}
                </div>
                <div className={styles["kpi-value"]}>{m.value}</div>
                {m.delta ? (
                  <div
                    className={`${styles["kpi-delta"]} ${
                      dir === "up"
                        ? styles.up
                        : dir === "down"
                          ? styles.down
                          : styles.neutral
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
                            ? styles.highlight
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

      <div className={styles["chip-rail"]}>
        {chips.map((id) => {
          const def = METRIC_BY_ID[id];
          if (!def) return null;
          const m = def.compute(ctx);
          return (
            <span key={id} className={styles["stat-chip"]}>
              <span className={styles["chip-label"]}>{def.label}</span>
              <span
                className={`${styles["chip-value"]} ${
                  m.tone === "ok"
                    ? styles.ok
                    : m.tone === "err"
                      ? styles.error
                      : m.tone === "warn"
                        ? styles.warning
                        : ""
                }`}
              >
                {m.value}
              </span>
            </span>
          );
        })}
        <Button
          size="sm"
          variant="ghost"
          className={styles["add-metric"]}
          onClick={onCustomize}
        >
          <Plus width={14} height={14} />
          Add metric
        </Button>
      </div>
    </>
  );
}
