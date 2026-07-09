import { SOURCES, type Source } from "@pond/schema/db";
import { pipelineEvents, type SyncRunEvent } from "@pond/schema/events";
import { and, desc, eq, gte } from "drizzle-orm";
import { getDb } from "../../db";
import type { QueryHandlerMap } from "../helpers";

interface SyncRunHistoryEntry {
  id: number;
  ts: number;
  source: Source;
  trigger: string;
  outcome: SyncRunEvent["outcome"];
  durationMs: number;
  harvest: SyncRunEvent["harvest"];
  enqueue: SyncRunEvent["enqueue"];
  error: SyncRunEvent["error"];
  watchdogTripped: boolean;
}

function isSource(value: unknown): value is Source {
  return (
    typeof value === "string" && (SOURCES as readonly string[]).includes(value)
  );
}

function toEntry(row: {
  id: number;
  ts: unknown;
  trigger: string | null;
  payload: unknown;
}): SyncRunHistoryEntry {
  const payload = row.payload as SyncRunEvent;
  return {
    id: row.id,
    ts: row.ts instanceof Date ? row.ts.getTime() : Number(row.ts),
    source: payload.source,
    trigger: payload.trigger ?? row.trigger ?? "manual",
    outcome: payload.outcome,
    durationMs: payload.durationMs ?? 0,
    harvest: payload.harvest ?? null,
    enqueue: payload.enqueue ?? null,
    error: payload.error ?? null,
    watchdogTripped: payload.watchdogTripped ?? false,
  };
}

// Items a run contributed to the library: prefer the enqueue count, fall back
// to harvested-fresh so older events without `enqueue` still register.
function itemsOf(run: SyncRunHistoryEntry): number {
  return run.enqueue?.succeeded ?? run.harvest?.fresh ?? 0;
}

const OK_OUTCOMES = new Set<SyncRunEvent["outcome"]>(["ok", "noop"]);
const FAIL_OUTCOMES = new Set<SyncRunEvent["outcome"]>([
  "error",
  "auth_required",
  "rate_limited",
]);

interface SyncStats {
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

export const syncHistoryQueries: QueryHandlerMap = {
  // Past sync runs for one source, newest first.
  async "sync.history"(params) {
    const source = params.source;
    if (!isSource(source)) return { runs: [] as SyncRunHistoryEntry[] };

    const rawLimit = Number(params.limit ?? 25);
    const limit = Number.isFinite(rawLimit)
      ? Math.min(Math.max(Math.trunc(rawLimit), 1), 200)
      : 25;

    const db = await getDb();
    const rows = db
      .select()
      .from(pipelineEvents)
      .where(
        and(
          eq(pipelineEvents.kind, "sync.run.completed"),
          eq(pipelineEvents.source, source),
        ),
      )
      .orderBy(desc(pipelineEvents.ts))
      .limit(limit)
      .all();

    return { runs: rows.map(toEntry) };
  },

  // Past sync runs across every source, newest first. Powers the unified
  // "Recent runs" activity table on the Sources page.
  async "sync.recent"(params) {
    const rawLimit = Number(params.limit ?? 50);
    const limit = Number.isFinite(rawLimit)
      ? Math.min(Math.max(Math.trunc(rawLimit), 1), 500)
      : 50;

    const db = await getDb();
    const rows = db
      .select()
      .from(pipelineEvents)
      .where(eq(pipelineEvents.kind, "sync.run.completed"))
      .orderBy(desc(pipelineEvents.ts))
      .limit(limit)
      .all();

    return { runs: rows.map(toEntry) };
  },

  // Every sync run inside a rolling window, newest first. Powers the insight
  // dashboard, which aggregates in the renderer; capped like sync.stats so a
  // dense history can't flood the IPC channel.
  async "sync.runs"(params) {
    const rawDays = Number(params.days ?? 7);
    const days = Number.isFinite(rawDays)
      ? Math.min(Math.max(Math.trunc(rawDays), 1), 90)
      : 7;
    const sinceMs = Date.now() - days * 86_400_000;

    const db = await getDb();
    const rows = db
      .select()
      .from(pipelineEvents)
      .where(
        and(
          eq(pipelineEvents.kind, "sync.run.completed"),
          gte(pipelineEvents.ts, new Date(sinceMs)),
        ),
      )
      .orderBy(desc(pipelineEvents.ts))
      .limit(2000)
      .all();

    return { runs: rows.map(toEntry) };
  },

  // Rolling aggregate KPIs for the Sources header. Reduced in JS over the
  // recent run window so we never block on JSON aggregation in SQL.
  async "sync.stats"(params) {
    const rawDays = Number(params.days ?? 7);
    const days = Number.isFinite(rawDays)
      ? Math.min(Math.max(Math.trunc(rawDays), 1), 90)
      : 7;

    const db = await getDb();
    const rows = db
      .select()
      .from(pipelineEvents)
      .where(eq(pipelineEvents.kind, "sync.run.completed"))
      .orderBy(desc(pipelineEvents.ts))
      .limit(2000)
      .all()
      .map(toEntry);

    const now = Date.now();
    const dayMs = 86_400_000;
    const windowMs = days * dayMs;
    const cur = now - windowMs;
    const prev = now - windowMs * 2;
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayMs = todayStart.getTime();

    const current = rows.filter((r) => r.ts >= cur);
    const previous = rows.filter((r) => r.ts >= prev && r.ts < cur);

    const sumItems = (runs: SyncRunHistoryEntry[]) =>
      runs.reduce((acc, r) => acc + itemsOf(r), 0);
    const successRate = (runs: SyncRunHistoryEntry[]) => {
      if (runs.length === 0) return 0;
      const ok = runs.filter((r) => OK_OUTCOMES.has(r.outcome)).length;
      return Math.round((ok / runs.length) * 100);
    };
    const avgMs = (runs: SyncRunHistoryEntry[]) => {
      if (runs.length === 0) return 0;
      return Math.round(
        runs.reduce((acc, r) => acc + (r.durationMs || 0), 0) / runs.length,
      );
    };

    const stats: SyncStats = {
      itemsSynced: sumItems(current),
      itemsSyncedPrev: sumItems(previous),
      newToday: rows
        .filter((r) => r.ts >= todayMs)
        .reduce((acc, r) => acc + (r.harvest?.fresh ?? itemsOf(r)), 0),
      runsToday: rows.filter((r) => r.ts >= todayMs).length,
      runs: current.length,
      successRate: successRate(current),
      successRatePrev: successRate(previous),
      avgRunMs: avgMs(current),
      avgRunMsPrev: avgMs(previous),
      failed: current.filter((r) => FAIL_OUTCOMES.has(r.outcome)).length,
      recovered: current.filter((r) => r.watchdogTripped).length,
      lastRunAt: rows[0]?.ts ?? null,
    };

    return stats;
  },
};
