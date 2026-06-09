import { SOURCES, type Source } from "@pond/schema/db";
import { pipelineEvents, type SyncRunEvent } from "@pond/schema/events";
import { and, desc, eq } from "drizzle-orm";
import { getDb } from "../../db";
import type { QueryHandlerMap } from "../helpers";

export interface SyncRunHistoryEntry {
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

export const syncHistoryQueries: QueryHandlerMap = {
  // Past sync runs for one source, newest first. Reads the
  // `sync.run.completed` wide events committed by `core/sync`.
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

    const runs: SyncRunHistoryEntry[] = rows.map((row) => {
      const payload = row.payload as SyncRunEvent;
      return {
        id: row.id,
        ts: row.ts instanceof Date ? row.ts.getTime() : Number(row.ts),
        source,
        trigger: payload.trigger ?? row.trigger ?? "manual",
        outcome: payload.outcome,
        durationMs: payload.durationMs ?? row.durationMs ?? 0,
        harvest: payload.harvest ?? null,
        enqueue: payload.enqueue ?? null,
        error: payload.error ?? null,
        watchdogTripped: payload.watchdogTripped ?? false,
      };
    });

    return { runs };
  },
};
