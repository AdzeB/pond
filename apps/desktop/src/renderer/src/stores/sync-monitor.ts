import type { Source } from "@pond/schema/db";
import { useSelector } from "@tanstack/react-store";
import { Store } from "@tanstack/store";

type SyncState =
  | "idle"
  | "running"
  | "done"
  | "error"
  | "auth_required"
  // Backed off to protect the account (rate limited / governor cooldown).
  | "paused";

// Live wire shape pushed over onSyncStatus; mirrors the main process type, kept local to avoid crossing IPC.
interface SyncStatusUpdate {
  source: string;
  state: SyncState;
  message?: string;
  progress?: { current: number; total: number };
  lastSyncedAt?: string | null;
  lastError?: string | null;
}

export interface SyncSourceStatus {
  state: SyncState;
  message?: string;
  progress?: { current: number; total: number };
  lastSyncedAt: string | null;
  lastError: string | null;
  connected: boolean;
}

interface SyncMonitorState {
  bySource: Partial<Record<Source, SyncSourceStatus>>;
}

const EMPTY: SyncSourceStatus = {
  state: "idle",
  lastSyncedAt: null,
  lastError: null,
  connected: false,
};

const store = new Store<SyncMonitorState>({ bySource: {} });

export const syncMonitor = {
  // Apply a live status push; omitted fields keep the last value, but explicit null clears a stale error.
  ingest(update: SyncStatusUpdate): void {
    const source = update.source as Source;
    store.setState((s) => {
      const prev = s.bySource[source] ?? EMPTY;
      const next: SyncSourceStatus = {
        connected: prev.connected,
        state: update.state,
        message: update.message,
        progress: update.progress,
        lastSyncedAt:
          update.lastSyncedAt !== undefined
            ? update.lastSyncedAt
            : prev.lastSyncedAt,
        lastError:
          update.lastError !== undefined ? update.lastError : prev.lastError,
      };
      return { ...s, bySource: { ...s.bySource, [source]: next } };
    });
  },
  // Merge a snapshot pulled on open (one-shot `syncStatus` / `sourceStatus`).
  seed(source: Source, patch: Partial<SyncSourceStatus>): void {
    store.setState((s) => {
      const prev = s.bySource[source] ?? EMPTY;
      return {
        ...s,
        bySource: { ...s.bySource, [source]: { ...prev, ...patch } },
      };
    });
  },
};

export function useSyncBySource(): SyncMonitorState["bySource"] {
  return useSelector(store, (s) => s.bySource);
}
