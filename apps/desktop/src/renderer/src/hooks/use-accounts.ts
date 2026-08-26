import type { Source } from "@pond/schema/db";
import { useCallback, useEffect, useState } from "react";
import { syncMonitor } from "@/stores/sync-monitor";

export interface AccountRow {
  id: string;
  source: Source;
  handle: string | null;
  label: string | null;
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
