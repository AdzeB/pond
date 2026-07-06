import type { Source } from "@pond/schema/db";
import log from "electron-log/main.js";

export interface SyncStatusUpdate {
  source: Source;
  state:
    | "idle"
    | "running"
    | "done"
    | "error"
    | "auth_required"
    // Backed off to protect the account (rate limited / governor cooldown).
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
}

export const inFlight = new Map<Source, InFlight>();

export function isSyncing(source: Source): boolean {
  return inFlight.has(source);
}

export function cancelSync(source: Source): void {
  const entry = inFlight.get(source);
  if (!entry) return;
  entry.controller.abort();
  // Surface "Stopping…" immediately; the run winds down between steps.
  emit({ source, state: "running", message: "Stopping…" });
}
