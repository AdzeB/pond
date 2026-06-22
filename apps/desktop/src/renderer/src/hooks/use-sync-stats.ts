import { useEffect, useState } from "react";
import { useSyncBySource } from "@/stores/sync-monitor";

// Rolling aggregate KPIs returned by the `sync.stats` query. Mirrors the
// main-process `SyncStats` shape so the renderer never imports across IPC.
export interface SyncStats {
  itemsSynced: number;
  itemsSyncedPrev: number;
  newToday: number;
  runsToday: number;
  runs: number;
  successRate: number;
  successRatePrev: number;
  avgRunMs: number;
  avgRunMsPrev: number;
  failed: number;
  recovered: number;
  lastRunAt: number | null;
}

const EMPTY: SyncStats = {
  itemsSynced: 0,
  itemsSyncedPrev: 0,
  newToday: 0,
  runsToday: 0,
  runs: 0,
  successRate: 0,
  successRatePrev: 0,
  avgRunMs: 0,
  avgRunMsPrev: 0,
  failed: 0,
  recovered: 0,
  lastRunAt: null,
};

// Re-fetches whenever any source's live state flips so the header settles as
// soon as a run finishes. `days` controls the rolling window (and its delta).
export function useSyncStats(days = 7): { stats: SyncStats; loading: boolean } {
  const [stats, setStats] = useState<SyncStats>(EMPTY);
  const [loaded, setLoaded] = useState(false);
  const bySource = useSyncBySource();
  // Collapse the per-source map to a single string so the effect refetches on
  // any state transition without depending on object identity.
  const runningKey = Object.values(bySource)
    .map((v) => v?.state ?? "idle")
    .join(",");

  // biome-ignore lint/correctness/useExhaustiveDependencies: runningKey is a refetch trigger
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = (await window.pond.query("sync.stats", {
          days,
        })) as SyncStats;
        if (!cancelled) setStats(res ?? EMPTY);
      } catch {
        if (!cancelled) setStats(EMPTY);
      } finally {
        if (!cancelled) setLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [days, runningKey]);

  return { stats, loading: !loaded };
}
