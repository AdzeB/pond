import type { Op, Source } from "@pond/schema/db";
import type { Save } from "@/lib/types";
import { humanizeError, preferIngestError, stageLabel } from "./queue";

export type DownloadStatus =
  | "pending"
  | "running"
  | "blocked"
  | "failed"
  | "complete";

export type StatusFilter = "in-progress" | "failed" | "complete";

export interface DownloadRow {
  id: string;
  saveId: string;
  name: string;
  url: string;
  source: string;
  status: DownloadStatus;
  stage: string | null;
  op: Op | null;
  progress: number | null;
  attempts: number;
  error: string | null;
  ts: number;
  durationMs: number | null;
  live: boolean;
}

export interface DownloadFilters {
  statuses: ReadonlySet<StatusFilter>;
  sources: ReadonlySet<string>;
  ops: ReadonlySet<Op>;
  q: string;
}

const DEFAULT_STATUSES: ReadonlySet<StatusFilter> = new Set([
  "in-progress",
  "failed",
]);

export function defaultDownloadFilters(): DownloadFilters {
  return {
    statuses: new Set(DEFAULT_STATUSES),
    sources: new Set(),
    ops: new Set(),
    q: "",
  };
}

function liveStatus(save: Save): DownloadStatus | null {
  if (save.status === "failed") return "failed";
  if (save.status !== "ingesting") return null;
  const tasks = save.tasks ?? [];
  if (tasks.some((t) => t.status === "running")) return "running";
  if (tasks.some((t) => t.status === "blocked")) return "blocked";
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
    if (t.status !== "failed" && t.status !== "blocked") continue;
    error = preferIngestError(error, t.lastError);
  }
  return error;
}

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
    });
  }
  rows.sort((a, b) => b.ts - a.ts);
  return rows;
}

export function statusBucket(status: DownloadStatus): StatusFilter {
  if (status === "failed") return "failed";
  if (status === "complete") return "complete";
  return "in-progress";
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
  if (filters.sources.size > 0 && !filters.sources.has(row.source)) {
    return false;
  }
  if (filters.ops.size > 0 && (row.op == null || !filters.ops.has(row.op))) {
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

export function historyToDownloadRow(input: {
  id: number;
  saveId: string;
  title: string | null;
  url: string;
  source: Source;
  outcome: "complete" | "failed";
  durationMs: number;
  attempts: number;
  failedOp: Op | null;
  error: { name: string; message: string } | null;
  ts: number;
}): DownloadRow {
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
