import { useEffect, useState } from "react";
import type { SyncRun } from "@/hooks/use-sync-history";
import { useSyncBySource } from "@/stores/sync-monitor";

// Every sync run inside a rolling window of N days, newest first. Backs the
// insight dashboard; re-fetches whenever any source's live state changes so a
// run that just finished shows up without a manual refresh.
export function useRunsWindow(days: number): {
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
        const res = (await window.pond.query("sync.runs", { days })) as {
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
  }, [days, runningKey]);

  return { runs, loading: !loaded };
}
