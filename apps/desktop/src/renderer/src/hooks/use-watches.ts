import type { Source, WatchKind } from "@pond/schema/db";
import { useCallback, useEffect, useState } from "react";
import { syncMonitor } from "@/stores/sync-monitor";

export interface WatchRow {
  id: string;
  source: Source;
  handle: string;
  kind?: WatchKind;
  label: string | null;
  avatarUrl?: string | null;
  via: string | null;
  addedAt: string;
  sync: {
    lastSyncedAt: string | null;
    lastError: string | null;
    knownCount: number;
  };
  syncing: boolean;
}

export const WATCHABLE: readonly Source[] = [
  "arena",
  "youtube",
  "tiktok",
  "instagram",
  "twitter",
  "pinterest",
  "cosmos",
];

const WATCH_KINDS: Partial<Record<Source, readonly WatchKind[]>> = {
  arena: ["channel", "user", "group"],
  youtube: ["channel", "playlist"],
  twitter: ["user", "list"],
  pinterest: ["user", "board"],
  cosmos: ["user", "cluster"],
};

export function watchKindsFor(source: Source): readonly WatchKind[] {
  return WATCH_KINDS[source] ?? ["user"];
}

export function watchKindLabel(kind: WatchKind | undefined): string {
  switch (kind) {
    case "channel":
      return "channel";
    case "group":
      return "group";
    case "playlist":
      return "playlist";
    case "board":
      return "board";
    case "cluster":
      return "cluster";
    case "list":
      return "list";
    default:
      return "account";
  }
}

export const WATCH_NEEDS_SESSION: readonly Source[] = ["instagram", "twitter"];

export function useWatches(): {
  watches: WatchRow[];
  loading: boolean;
  refetch: () => Promise<WatchRow[]>;
} {
  const [watches, setWatches] = useState<WatchRow[]>([]);
  const [loaded, setLoaded] = useState(false);

  const refetch = useCallback(async (): Promise<WatchRow[]> => {
    try {
      const res = (await window.pond.query("watches.list", {})) as {
        watches: WatchRow[];
      };
      const rows = res?.watches ?? [];
      setWatches(rows);
      for (const watch of rows) {
        syncMonitor.seed(watch.id, watch.source, {
          connected: true,
          lastSyncedAt: watch.sync?.lastSyncedAt ?? null,
          lastError: watch.sync?.lastError ?? null,
          ...(watch.syncing ? { state: "running" as const } : {}),
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
      if (rows.some((row) => row.avatarUrl === undefined)) {
        timer = setTimeout(() => void refetch(), 4000);
      }
    });
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [refetch]);

  return { watches, loading: !loaded, refetch };
}
