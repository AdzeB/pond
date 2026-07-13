import type { Source, WatchKind } from "@pond/schema/db";
import { useCallback, useEffect, useState } from "react";
import { syncMonitor } from "@/stores/sync-monitor";

/** Mirrors the main-process WatchedAccount + live status from `watches.list`, kept local so the renderer never imports across IPC. */
export interface WatchRow {
  id: string;
  source: Source;
  handle: string;
  /** What the watch points at; absent on watches created before kinds. */
  kind?: WatchKind;
  label: string | null;
  /** Best-effort profile picture resolved by the main process. */
  avatarUrl?: string | null;
  /** Connected account whose session checks ride; null for public sources. */
  via: string | null;
  addedAt: string;
  sync: {
    lastSyncedAt: string | null;
    lastError: string | null;
    knownCount: number;
  };
  syncing: boolean;
}

/** Must match core/watch/types.ts. */
export const WATCHABLE: readonly Source[] = [
  "arena",
  "youtube",
  "tiktok",
  "instagram",
  "twitter",
  "pinterest",
  "cosmos",
];

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

/** Sources whose watch checks borrow a connected account's session. */
export const WATCH_NEEDS_SESSION: readonly Source[] = ["instagram", "twitter"];

/** Seeds the sync-monitor store so cards aren't blank before live pushes arrive; watch status updates ride the same channel as accounts, keyed by watch id. */
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
        /** Watches have no session of their own; "connected" keeps cardModel out of its Not-connected bucket. */
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
      /** Avatars resolve in the background on the main side; one delayed refetch picks them up without polling. */
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
