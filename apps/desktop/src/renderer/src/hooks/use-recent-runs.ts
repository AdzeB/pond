import { useEffect, useState } from "react";
import type { SyncRun } from "@/hooks/use-sync-history";
import { useSyncBySource } from "@/stores/sync-monitor";

// Recent sync runs across every source, newest first. Backs the unified
// "Recent runs" activity table. Re-fetches whenever any source's live state
// changes so a run that just landed appears without a manual refresh.
export function useRecentRuns(limit = 50): {
  runs: SyncRun[];
  loading: boolean;
} {
  const [runs, setRuns] = useState<SyncRun[]>([]);
  const [loaded, setLoaded] = useState(false);
  const bySource = useSyncBySource();
  const runningKey = Object.values(bySource)
    .map((v) => v?.state ?? "idle")
    .join(",");

  // biome-ignore lint/correctness/useExhaustiveDependencies: runningKey is a refetch trigger
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = (await window.pond.query("sync.recent", { limit })) as {
          runs: SyncRun[];
        };
        if (!cancelled) setRuns(res?.runs ?? []);
      } catch {
        if (!cancelled) setRuns([]);
      } finally {
        if (!cancelled) setLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [limit, runningKey]);

  return { runs, loading: !loaded };
}
