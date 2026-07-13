import type { Source } from "@pond/schema/db";
import { useCallback, useEffect, useState } from "react";
import { syncMonitor } from "@/stores/sync-monitor";

/** Mirrors the main-process ConnectedAccount + live status from `accounts.list`, kept local so the renderer never imports across IPC. */
export interface AccountRow {
  id: string;
  source: Source;
  handle: string | null;
  label: string | null;
  /** Best-effort profile picture resolved by the main process. */
  avatarUrl?: string | null;
  addedAt: string;
  sync: {
    lastSyncedAt: string | null;
    lastError: string | null;
    knownCount: number;
  };
  connected: boolean;
  syncing: boolean;
}

/** Seeds a one-shot snapshot into the sync-monitor store so rows aren't blank before live pushes arrive. */
export function useAccounts(): {
  accounts: AccountRow[];
  loading: boolean;
  refetch: () => Promise<AccountRow[]>;
} {
  const [accounts, setAccounts] = useState<AccountRow[]>([]);
  const [loaded, setLoaded] = useState(false);

  const refetch = useCallback(async (): Promise<AccountRow[]> => {
    try {
      const res = (await window.pond.query("accounts.list", {})) as {
        accounts: AccountRow[];
      };
      const rows = res?.accounts ?? [];
      setAccounts(rows);
      for (const account of rows) {
        syncMonitor.seed(account.id, account.source, {
          connected: account.connected,
          lastSyncedAt: account.sync?.lastSyncedAt ?? null,
          lastError: account.sync?.lastError ?? null,
          ...(account.syncing ? { state: "running" as const } : {}),
        });
      }
      return rows;
    } catch {
      return [];
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    void refetch().then((rows) => {
      /** Avatars resolve in the background on the main side; one delayed refetch picks them up without polling. */
      if (rows.some((row) => row.handle && row.avatarUrl === undefined)) {
        timer = setTimeout(() => void refetch(), 4000);
      }
    });
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [refetch]);

  return { accounts, loading: !loaded, refetch };
}
