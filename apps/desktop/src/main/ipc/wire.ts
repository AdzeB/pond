import type { SyncAction, Task } from "@pond/schema/db";
import { toMs } from "@shared/to-ms";
import type {
  WireRow,
  WireSave,
  WireSaveRow,
  WireSyncAction,
  WireSyncPayload,
  WireTask,
} from "@shared/wire";
import { z } from "zod";
import { slimRawJson } from "../lib/raw-slim";

export type { WireSaveRow as SaveListRow } from "@shared/wire";

interface WireSaveOptions {
  slim?: boolean;
}

export function toWireSave(
  row: WireSaveRow,
  taskRows?: Task[],
  opts?: WireSaveOptions,
): WireSave {
  const wire: WireSave = {
    ...row,
    rawJson: opts?.slim ? slimRawJson(row.rawJson) : row.rawJson,
    savedAt: toMs(row.savedAt) ?? 0,
    createdAt: toMs(row.createdAt) ?? 0,
    deletedAt: toMs(row.deletedAt),
    publishedAt: toMs(row.publishedAt),
    ingestStartedAt: toMs(row.ingestStartedAt),
    ingestCompletedAt: toMs(row.ingestCompletedAt),
  };
  if (taskRows) wire.tasks = taskRows.map(toWireTask);
  return wire;
}

export function toWireSaves(
  rows: WireSaveRow[],
  tasksBySave?: Map<string, Task[]>,
  opts?: WireSaveOptions,
): WireSave[] {
  return rows.map((row) => toWireSave(row, tasksBySave?.get(row.id), opts));
}

function toWireTask(task: Task): WireTask {
  return {
    op: task.op,
    status: task.status,
    attempts: task.attempts,
    maxAttempts: task.maxAttempts,
    lastError: task.lastError,
    nextRunAt: toMs(task.nextRunAt) ?? 0,
    updatedAt: toMs(task.updatedAt) ?? 0,
  };
}

/** Sync payloads are model rows, or arrays of them, straight out of the `data`/`prev_data` JSON columns. */
const WireRowSchema = z.custom<WireRow>(
  (value) => value instanceof Object && !Array.isArray(value),
);
const WirePayloadSchema = z
  .union([z.array(WireRowSchema), WireRowSchema])
  .nullable()
  .catch(null);

export function toWireSyncAction(action: SyncAction): WireSyncAction {
  return {
    ...action,
    createdAt: toMs(action.createdAt) ?? 0,
    data: normaliseDataPayload(action.data),
    prevData: normaliseDataPayload(action.prevData),
  };
}

const TIMESTAMP_KEYS = [
  "savedAt",
  "createdAt",
  "deletedAt",
  "publishedAt",
] as const;

function normaliseDataPayload(value: SyncAction["data"]): WireSyncPayload {
  const payload = WirePayloadSchema.parse(value);
  if (payload === null) return null;
  return Array.isArray(payload)
    ? payload.map(normaliseRow)
    : normaliseRow(payload);
}

function normaliseRow(row: WireRow): WireRow {
  const stamped = TIMESTAMP_KEYS.filter((key) => key in row).map(
    (key) => [key, toMs(row[key])] as const,
  );
  return { ...row, ...Object.fromEntries(stamped) };
}
