import type { Source } from "@pond/schema/db";
import { useEffect, useState } from "react";
import { useSyncBySource } from "@/stores/sync-monitor";

// Mirrors the main-process SyncOutcome so the renderer never imports across IPC.
type SyncOutcome =
  | "ok"
  | "noop"
  | "auth_required"
  | "rate_limited"
  | "aborted"
  | "error";

// One recorded sync run, as returned by the `sync.history` query.
export interface SyncRun {
  id: number;
  ts: number;
  source: Source;
  trigger: string;
  outcome: SyncOutcome;
  durationMs: number;
  harvest: {
    seen: number | null;
    fresh: number | null;
    recovery: number | null;
  } | null;
  enqueue: { succeeded: number; failed: number } | null;
  error: { name: string; message: string } | null;
  watchdogTripped: boolean;
}

// Recorded sync runs for one source, newest first. Re-fetches whenever the
// source's live state changes so a run that just finished shows up immediately.
export function useSyncHistory(
  source: Source,
  limit = 10,
): { runs: SyncRun[]; loading: boolean } {
  const [runs, setRuns] = useState<SyncRun[]>([]);
  const [loaded, setLoaded] = useState(false);
  const liveState = useSyncBySource()[source]?.state;

  // liveState is a refetch trigger, not read in the effect: re-pull history
  // whenever a run starts/finishes so the timeline stays current.
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentional refetch trigger
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = (await window.pond.query("sync.history", {
          source,
          limit,
        })) as { runs: SyncRun[] };
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
  }, [source, limit, liveState]);

  return { runs, loading: !loaded };
}
