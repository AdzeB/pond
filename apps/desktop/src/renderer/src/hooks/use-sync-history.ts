import type { Source } from "@pond/schema/db";
import { useEffect, useState } from "react";
import { useSyncByAccount } from "@/stores/sync-monitor";

/** Mirrors the main-process SyncOutcome so the renderer never imports across IPC. */
type SyncOutcome =
  | "ok"
  | "noop"
  | "auth_required"
  | "rate_limited"
  | "aborted"
  | "error";

/** One recorded sync run, as returned by the `sync.history` query. */
export interface SyncRun {
  id: number;
  ts: number;
  source: Source;
  accountId: string | null;
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

/** Re-fetches whenever the account's live state changes so a just-finished run shows up immediately; no accountId returns every run for the source, including unattributed pre-multi-account rows. */
export function useSyncHistory(
  source: Source,
  limit = 10,
  accountId?: string,
): { runs: SyncRun[]; loading: boolean } {
  const [runs, setRuns] = useState<SyncRun[]>([]);
  const [loaded, setLoaded] = useState(false);
  const byAccount = useSyncByAccount();
  const liveState = accountId
    ? byAccount[accountId]?.state
    : Object.values(byAccount).find(
        (s) => s.source === source && s.state === "running",
      )?.state;

  /** liveState is a refetch trigger, not read in the effect: re-pull history whenever a run starts or finishes. */
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentional refetch trigger
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = (await window.pond.query("sync.history", {
          source,
          limit,
          ...(accountId ? { accountId } : {}),
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
  }, [source, accountId, limit, liveState]);

  return { runs, loading: !loaded };
}
