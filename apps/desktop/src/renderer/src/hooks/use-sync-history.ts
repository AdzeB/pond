import { SOURCES, type Source } from "@pond/schema/db";
import { useEffect, useState } from "react";
import { z } from "zod";
import { useSyncByAccount } from "@/stores/sync-monitor";

type SyncOutcome =
  | "ok"
  | "noop"
  | "auth_required"
  | "rate_limited"
  | "aborted"
  | "error";

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

const HistoryReplySchema = z
  .object({
    runs: z
      .array(
        z.object({
          id: z.number(),
          ts: z.number().catch(0),
          source: z.enum(SOURCES),
          accountId: z.string().nullable().catch(null),
          trigger: z.string().catch(""),
          outcome: z
            .enum([
              "ok",
              "noop",
              "auth_required",
              "rate_limited",
              "aborted",
              "error",
            ])
            .catch("error"),
          durationMs: z.number().catch(0),
          harvest: z
            .object({
              seen: z.number().nullable().catch(null),
              fresh: z.number().nullable().catch(null),
              recovery: z.number().nullable().catch(null),
            })
            .nullable()
            .catch(null),
          enqueue: z
            .object({
              succeeded: z.number().catch(0),
              failed: z.number().catch(0),
            })
            .nullable()
            .catch(null),
          error: z
            .object({
              name: z.string().catch(""),
              message: z.string().catch(""),
            })
            .nullable()
            .catch(null),
          watchdogTripped: z.boolean().catch(false),
        }),
      )
      .catch([]),
  })
  .catch({ runs: [] });

type HistoryParams = {
  source: Source;
  limit: number;
  accountId?: string;
};

interface SyncHistoryResult {
  runs: SyncRun[];
  loading: boolean;
}

export function useSyncHistory(
  source: Source,
  limit = 10,
  accountId?: string,
): SyncHistoryResult {
  const [runs, setRuns] = useState<SyncRun[]>([]);
  const [loaded, setLoaded] = useState(false);
  const byAccount = useSyncByAccount();
  const liveState = accountId
    ? byAccount[accountId]?.state
    : Object.values(byAccount).find(
        (s) => s.source === source && s.state === "running",
      )?.state;

  // biome-ignore lint/correctness/useExhaustiveDependencies: intentional refetch trigger
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const params: HistoryParams = { source, limit };
        if (accountId) params.accountId = accountId;
        const res = HistoryReplySchema.parse(
          await window.pond.query("sync.history", params),
        );
        if (!cancelled) setRuns(res.runs);
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
