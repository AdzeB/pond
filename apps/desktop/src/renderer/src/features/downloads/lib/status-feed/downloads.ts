import {
  CANCEL_REASON,
  OPS,
  type Op,
  SOURCES,
  type Source,
} from "@pond/schema/db";
import { INGEST_OUTCOMES } from "@pond/schema/events";
import { hostToSource } from "@pond/schema/sources";
import type { WireTask } from "@shared/wire";
import { z } from "zod";
import type { Save } from "@/features/saves/types";
import { humanizeError, preferIngestError, stageLabel } from "./queue";

export const HistoryPageSchema = z.object({
  rows: z.array(
    z.object({
      id: z.number(),
      saveId: z.string(),
      title: z.string().nullable(),
      url: z.string(),
      source: z.enum(SOURCES),
      outcome: z.enum(INGEST_OUTCOMES),
      durationMs: z.number(),
      attempts: z.number(),
      failedOp: z.enum(OPS).nullable(),
      error: z.object({ name: z.string(), message: z.string() }).nullable(),
      ts: z.number(),
    }),
  ),
  nextCursor: z.object({ ts: z.number(), id: z.number() }).nullable(),
});

type HistoryRow = z.infer<typeof HistoryPageSchema>["rows"][number];

export type HistoryCursor = z.infer<typeof HistoryPageSchema>["nextCursor"];

export const PipelineStatusSchema = z.object({ paused: z.boolean() });

export type DownloadStatus =
  | "pending"
  | "running"
  | "retrying"
  | "blocked"
  | "failed"
  | "cancelled"
  | "skipped"
  | "complete";

export type StatusFilter =
  | "in-progress"
  | "failed"
  | "cancelled"
  | "skipped"
  | "complete";

export interface DownloadRow {
  id: string;
  saveId: string;
  name: string;
  url: string;
  source: Source;
  status: DownloadStatus;
  stage: string | null;
  op: Op | null;
  progress: number | null;
  attempts: number;
  error: string | null;
  ts: number;
  durationMs: number | null;
  live: boolean;
  interactive?: boolean;
}

export interface DownloadFilters {
  statuses: ReadonlySet<StatusFilter>;
  sources: ReadonlySet<Source>;
  q: string;
}

export const STATUS_FILTER_OPTIONS: readonly {
  id: StatusFilter;
  label: string;
}[] = [
  { id: "in-progress", label: "In Progress" },
  { id: "failed", label: "Failed" },
  { id: "cancelled", label: "Cancelled" },
  { id: "skipped", label: "Skipped" },
  { id: "complete", label: "Completed" },
];

export function defaultDownloadFilters(): DownloadFilters {
  return {
    statuses: new Set(),
    sources: new Set(),
    q: "",
  };
}

export function downloadFiltersActive(filters: DownloadFilters): boolean {
  return filters.statuses.size > 0 || filters.sources.size > 0;
}

function wasCancelled(save: Save): boolean {
  const stopped = (save.tasks ?? []).filter(
    (t) => t.status === "failed" || t.status === "blocked",
  );
  return (
    stopped.length > 0 && stopped.every((t) => t.lastError === CANCEL_REASON)
  );
}

function isRetryingTask(task: WireTask): boolean {
  return (
    task.status === "pending" && (task.attempts > 0 || Boolean(task.lastError))
  );
}

function liveStatus(save: Save): DownloadStatus | null {
  if (save.status === "skipped") return "skipped";
  if (save.status === "failed") {
    return wasCancelled(save) ? "cancelled" : "failed";
  }
  if (save.status !== "ingesting") return null;
  const tasks = save.tasks ?? [];
  if (tasks.some((t) => t.status === "running")) return "running";
  if (tasks.some((t) => t.status === "blocked")) return "blocked";
  const next = tasks.find((t) => t.status !== "done");
  if (next && isRetryingTask(next)) return "retrying";
  return "pending";
}

function currentOp(save: Save): Op | null {
  const tasks = save.tasks ?? [];
  const running = tasks.find((t) => t.status === "running");
  if (running) return running.op;
  const failed = tasks.find((t) => t.status === "failed");
  if (failed) return failed.op;
  const blocked = tasks.find((t) => t.status === "blocked");
  if (blocked) return blocked.op;
  const next = tasks.find((t) => t.status !== "done");
  return next?.op ?? null;
}

function rowError(save: Save): string | null {
  let error: string | null = null;
  for (const t of save.tasks ?? []) {
    if (
      t.status !== "failed" &&
      t.status !== "blocked" &&
      !(t.status === "pending" && t.lastError)
    ) {
      continue;
    }
    error = preferIngestError(error, t.lastError);
  }
  return error;
}

const DOWNLOAD_STATUS_RANK = {
  running: 0,
  retrying: 1,
  blocked: 2,
  pending: 3,
  failed: 4,
  cancelled: 5,
  skipped: 6,
  complete: 7,
} satisfies Record<DownloadStatus, number>;

export function projectLiveDownloads(saves: readonly Save[]): DownloadRow[] {
  const rows: DownloadRow[] = [];
  for (const save of saves) {
    if (save.deletedAt != null) continue;
    const status = liveStatus(save);
    if (!status) continue;
    const tasks = save.tasks ?? [];
    const done = tasks.filter((t) => t.status === "done").length;
    const op = currentOp(save);
    const attempts = tasks.reduce((max, t) => Math.max(max, t.attempts), 0);
    const ts = save.ingestStartedAt ?? save.savedAt ?? save.createdAt;
    const rawError = rowError(save);
    rows.push({
      id: save.id,
      saveId: save.id,
      name: save.title?.trim() || save.url,
      url: save.url,
      source: save.source,
      status,
      stage: op ? stageLabel(op, save.source) : null,
      op,
      progress: tasks.length > 0 ? done / tasks.length : 0,
      attempts,
      error: rawError ? humanizeError(rawError) : null,
      ts,
      durationMs: null,
      live: true,
      interactive: tasks.some((t) => t.interactive),
    });
  }
  rows.sort(
    (a, b) =>
      DOWNLOAD_STATUS_RANK[a.status] - DOWNLOAD_STATUS_RANK[b.status] ||
      b.ts - a.ts,
  );
  return rows;
}

export function statusBucket(status: DownloadStatus): StatusFilter {
  if (status === "failed" || status === "blocked") return "failed";
  if (status === "cancelled") return "cancelled";
  if (status === "skipped") return "skipped";
  if (status === "complete") return "complete";
  return "in-progress";
}

export function downloadRowSource(row: DownloadRow): Source {
  return hostToSource(row.url) ?? row.source;
}

export function matchesDownloadFilters(
  row: DownloadRow,
  filters: DownloadFilters,
): boolean {
  if (
    filters.statuses.size > 0 &&
    !filters.statuses.has(statusBucket(row.status))
  ) {
    return false;
  }
  if (
    filters.sources.size > 0 &&
    !filters.sources.has(downloadRowSource(row))
  ) {
    return false;
  }
  const q = filters.q.trim().toLowerCase();
  if (!q) return true;
  const hay = [row.name, row.url, row.stage, row.error, row.source]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return hay.includes(q);
}

export function mergeDownloadRows(
  live: readonly DownloadRow[],
  history: readonly DownloadRow[],
): DownloadRow[] {
  const liveIds = new Set(live.map((r) => r.saveId));
  const extra = history.filter((r) => !liveIds.has(r.saveId));
  return [...live, ...extra];
}

export function historyToDownloadRow(input: HistoryRow): DownloadRow {
  const failed = input.outcome === "failed";
  return {
    id: `history:${input.id}`,
    saveId: input.saveId,
    name: input.title?.trim() || input.url,
    url: input.url,
    source: input.source,
    status: failed ? "failed" : "complete",
    stage: input.failedOp ? stageLabel(input.failedOp, input.source) : "Saved",
    op: input.failedOp,
    progress: null,
    attempts: input.attempts,
    error: failed ? humanizeError(input.error?.message ?? null) : null,
    ts: input.ts,
    durationMs: input.durationMs,
    live: false,
  };
}
