import { OPS, type Op, type Source, saves } from "@pond/schema/db";
import { pipelineEvents, type SaveIngestEvent } from "@pond/schema/events";
import { isSource as isSourceId } from "@pond/schema/sources";
import { and, desc, eq, inArray, like, lt, or, sql } from "drizzle-orm";
import { pipelineSnapshot } from "../../core/pipeline/reconciler";
import { getDb } from "../../db";
import type { QueryHandlerMap } from "../helpers";
import { cursorFor, type HistoryCursor } from "./downloads-page";

const PAGE_MAX = 200;
const PAGE_DEFAULT = 50;

export interface DownloadHistoryRow {
  id: number;
  saveId: string;
  title: string | null;
  url: string;
  source: Source;
  outcome: SaveIngestEvent["outcome"];
  durationMs: number;
  attempts: number;
  failedOp: Op | null;
  error: { name: string; message: string } | null;
  ts: number;
}

function isSource(value: unknown): value is Source {
  return typeof value === "string" && isSourceId(value);
}

function isOp(value: unknown): value is Op {
  return (
    typeof value === "string" && (OPS as readonly string[]).includes(value)
  );
}

function parseCursor(raw: unknown): HistoryCursor | null {
  if (raw == null || typeof raw !== "object") return null;
  const rec = raw as Record<string, unknown>;
  const ts = Number(rec.ts);
  const id = Number(rec.id);
  if (!Number.isFinite(ts) || !Number.isFinite(id)) return null;
  return { ts, id };
}

function toHistoryRow(row: {
  id: number;
  ts: unknown;
  saveId: string | null;
  source: Source | null;
  payload: unknown;
  title: string | null;
  url: string | null;
}): DownloadHistoryRow | null {
  const payload = row.payload as SaveIngestEvent;
  const saveId = payload.saveId ?? row.saveId;
  if (!saveId) return null;
  const ts = row.ts instanceof Date ? row.ts.getTime() : Number(row.ts);
  return {
    id: row.id,
    saveId,
    title: row.title,
    url: payload.url || row.url || "",
    source: payload.source ?? row.source ?? "web",
    outcome: payload.outcome,
    durationMs: payload.durationMs ?? 0,
    attempts: payload.attempts ?? 0,
    failedOp: payload.failedOp ?? null,
    error: payload.error ?? null,
    ts,
  };
}

export const downloadsQueries: QueryHandlerMap = {
  "pipeline.status"() {
    return pipelineSnapshot();
  },

  async "downloads.history"(params) {
    const rawLimit = Number(params.limit ?? PAGE_DEFAULT);
    const limit = Number.isFinite(rawLimit)
      ? Math.min(Math.max(Math.trunc(rawLimit), 1), PAGE_MAX)
      : PAGE_DEFAULT;
    const cursor = parseCursor(params.cursor);
    const q =
      typeof params.q === "string" && params.q.trim().length > 0
        ? params.q.trim()
        : null;
    const sources = Array.isArray(params.sources)
      ? params.sources.filter(isSource)
      : [];
    const ops = Array.isArray(params.ops) ? params.ops.filter(isOp) : [];

    const db = await getDb();
    const clauses = [
      eq(pipelineEvents.kind, "save.ingest.completed"),
      eq(pipelineEvents.outcome, "complete"),
    ];
    if (sources.length > 0) {
      clauses.push(inArray(pipelineEvents.source, sources));
    }
    if (ops.length > 0) {
      clauses.push(inArray(pipelineEvents.op, ops));
    }
    if (cursor) {
      const older = or(
        lt(pipelineEvents.ts, new Date(cursor.ts)),
        and(
          eq(pipelineEvents.ts, new Date(cursor.ts)),
          lt(pipelineEvents.id, cursor.id),
        ),
      );
      if (older) clauses.push(older);
    }
    if (q) {
      const pattern = `%${q.replaceAll("%", "").replaceAll("_", "")}%`;
      const match = or(
        like(saves.title, pattern),
        like(saves.url, pattern),
        like(pipelineEvents.errorMessage, pattern),
        sql`json_extract(${pipelineEvents.payload}, '$.url') like ${pattern}`,
      );
      if (match) clauses.push(match);
    }

    const raw = db
      .select({
        id: pipelineEvents.id,
        ts: pipelineEvents.ts,
        saveId: pipelineEvents.saveId,
        source: pipelineEvents.source,
        payload: pipelineEvents.payload,
        title: saves.title,
        url: saves.url,
      })
      .from(pipelineEvents)
      .leftJoin(saves, eq(pipelineEvents.saveId, saves.id))
      .where(and(...clauses))
      .orderBy(desc(pipelineEvents.ts), desc(pipelineEvents.id))
      .limit(limit + 1)
      .all();

    const mapped = raw
      .map(toHistoryRow)
      .filter((row): row is DownloadHistoryRow => row != null);
    const hasMore = mapped.length > limit;
    const rows = hasMore ? mapped.slice(0, limit) : mapped;
    return {
      rows,
      nextCursor: hasMore ? cursorFor(rows) : null,
    };
  },
};
