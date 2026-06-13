import type { Source } from "@pond/schema/db";
import { useStore } from "@tanstack/react-store";
import { Store } from "@tanstack/store";

export type SyncState = "idle" | "running" | "done" | "error" | "auth_required";

// The live wire shape pushed over `window.pond.onSyncStatus`. Mirrors
// `SyncStatusUpdate` in the main process; kept local so the renderer doesn't
// reach across the IPC boundary for a type.
export interface SyncStatusUpdate {
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
  open: boolean;
  bySource: Partial<Record<Source, SyncSourceStatus>>;
}

const EMPTY: SyncSourceStatus = {
  state: "idle",
  lastSyncedAt: null,
  lastError: null,
  connected: false,
};

const store = new Store<SyncMonitorState>({ open: false, bySource: {} });

export const syncMonitor = {
  open(): void {
    store.setState((s) => (s.open ? s : { ...s, open: true }));
  },
  close(): void {
    store.setState((s) => {
      if (!s.open) return s;
      // Drop per-run transient fields so a reopen doesn't flash a stale
      // message/progress before the next snapshot lands.
      const bySource: SyncMonitorState["bySource"] = {};
      for (const [key, value] of Object.entries(s.bySource)) {
        if (!value) continue;
        bySource[key as Source] = {
          ...value,
          message: undefined,
          progress: undefined,
        };
      }
      return { ...s, open: false, bySource };
    });
  },
  toggle(): void {
    store.setState((s) => ({ ...s, open: !s.open }));
  },
  // Apply a live status push. Optional fields fall back to the last known
  // value when omitted (running updates rarely carry `lastSyncedAt`), but an
  // explicit `null` is honored so a fresh run can clear a stale error.
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

export function useSyncOpen(): boolean {
  return useStore(store, (s) => s.open);
}

export function useSyncBySource(): SyncMonitorState["bySource"] {
  return useStore(store, (s) => s.bySource);
}

export function useAnySyncRunning(): boolean {
  return useStore(store, (s) =>
    Object.values(s.bySource).some((v) => v?.state === "running"),
  );
}
