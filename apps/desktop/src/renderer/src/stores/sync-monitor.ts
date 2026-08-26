import type { Source } from "@pond/schema/db";
import { useSelector } from "@tanstack/react-store";
import { Store } from "@tanstack/store";

type SyncState =
  | "idle"
  | "running"
  | "done"
  | "error"
  | "auth_required"
  | "paused";

interface SyncStatusUpdate {
  accountId: string;
  source: string;
  state: SyncState;
  message?: string;
  progress?: { current: number; total: number };
  lastSyncedAt?: string | null;
  lastError?: string | null;
}

export interface SyncAccountStatus {
  source: Source;
  state: SyncState;
  message?: string;
  progress?: { current: number; total: number };
  lastSyncedAt: string | null;
  lastError: string | null;
  connected: boolean;
}

export type SyncSourceStatus = SyncAccountStatus;

interface SyncMonitorState {
  byAccount: Record<string, SyncAccountStatus>;
}

const EMPTY: Omit<SyncAccountStatus, "source"> = {
  state: "idle",
  lastSyncedAt: null,
  lastError: null,
  connected: false,
};

const store = new Store<SyncMonitorState>({ byAccount: {} });

export const syncMonitor = {
  ingest(update: SyncStatusUpdate): void {
    const source = update.source as Source;
    store.setState((s) => {
      const prev = s.byAccount[update.accountId] ?? { ...EMPTY, source };
      const next: SyncAccountStatus = {
        source,
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
      return {
        ...s,
        byAccount: { ...s.byAccount, [update.accountId]: next },
      };
    });
  },
  seed(
    accountId: string,
    source: Source,
    patch: Partial<SyncAccountStatus>,
  ): void {
    store.setState((s) => {
      const prev = s.byAccount[accountId] ?? { ...EMPTY, source };
      return {
        ...s,
        byAccount: { ...s.byAccount, [accountId]: { ...prev, ...patch } },
      };
    });
  },
};

export function useSyncByAccount(): SyncMonitorState["byAccount"] {
  return useSelector(store, (s) => s.byAccount);
}
