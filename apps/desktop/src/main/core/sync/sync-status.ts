import type { Source } from "@pond/schema/db";
import log from "electron-log/main.js";

export interface SyncStatusUpdate {
  /** The source is kept alongside for per-platform grouping in the UI. */
  accountId: string;
  source: Source;
  state:
    | "idle"
    | "running"
    | "done"
    | "error"
    | "auth_required"
    /** Backed off to protect the account (rate limited / governor cooldown). */
    | "paused";
  message?: string;
  progress?: { current: number; total: number };
  lastSyncedAt?: string | null;
  lastError?: string | null;
}

type StatusListener = (update: SyncStatusUpdate) => void;
const listeners = new Set<StatusListener>();

export function subscribeToSyncStatus(cb: StatusListener): () => void {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

export function emit(update: SyncStatusUpdate): void {
  for (const cb of listeners) {
    try {
      cb(update);
    } catch (err) {
      log.warn("[pond sync] status listener threw", err);
    }
  }
}

export interface InFlight {
  controller: AbortController;
  startedAt: number;
  watchdog: ReturnType<typeof setTimeout>;
  source: Source;
}

/** One in-flight run per account; the scheduler staggers same-platform runs. @see syncAllSources */
export const inFlight = new Map<string, InFlight>();

export function isSyncing(accountId: string): boolean {
  return inFlight.has(accountId);
}

export function isSourceSyncing(source: Source): boolean {
  for (const entry of inFlight.values()) {
    if (entry.source === source) return true;
  }
  return false;
}

export function cancelAllSyncs(): void {
  for (const accountId of Array.from(inFlight.keys())) {
    cancelSync(accountId);
  }
}

export function cancelSync(accountId: string): void {
  const entry = inFlight.get(accountId);
  if (!entry) return;
  entry.controller.abort();
  /** Surface "Stopping" immediately; the run winds down between steps. */
  emit({
    accountId,
    source: entry.source,
    state: "running",
    message: "Stopping",
  });
}
