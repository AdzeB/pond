import { Button, useToast } from "@pond/ui";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Fragment, useCallback, useEffect, useState } from "react";
import { Settings } from "@/components/settings";
import {
  ALL_SOURCES,
  type AnySource,
  SOURCE_DESCRIPTIONS,
} from "@/components/settings/sections/_types";
import { getSourceLabel } from "@/lib/source-labels";
import { formatRelative } from "@/lib/sync-helpers";
import styles from "./styles.module.css";

interface SourceSyncState {
  running: boolean;
  lastSyncedAt: string | null;
  lastError: string | null;
}

function emptyStatus(): Record<AnySource, boolean> {
  return Object.fromEntries(ALL_SOURCES.map((s) => [s.id, false])) as Record<
    AnySource,
    boolean
  >;
}

function emptySyncStates(): Record<AnySource, SourceSyncState> {
  return Object.fromEntries(
    ALL_SOURCES.map((s) => [
      s.id,
      { running: false, lastSyncedAt: null, lastError: null },
    ]),
  ) as Record<AnySource, SourceSyncState>;
}

export function Sources() {
  const toast = useToast();
  const qc = useQueryClient();
  const [pendingSource, setPendingSource] = useState<AnySource | null>(null);
  const [syncStates, setSyncStates] = useState(emptySyncStates());

  const { data: connected = emptyStatus(), isSuccess: statusReady } = useQuery<
    Record<AnySource, boolean>
  >({
    queryKey: ["sources", "status"],
    queryFn: async () => {
      const entries = await Promise.all(
        ALL_SOURCES.map(async ({ id }) => {
          const r = await window.pond.sourceStatus(id).catch(() => null);
          return [id, r?.ok ? r.connected : false] as const;
        }),
      );
      const next = emptyStatus();
      for (const [id, c] of entries) next[id] = c;
      return next;
    },
  });

  useQuery({
    queryKey: ["sync", "states", "initial"],
    queryFn: async () => {
      const entries = await Promise.all(
        ALL_SOURCES.map(async ({ id }) => {
          const r = await window.pond.syncStatus(id);
          return [
            id,
            {
              running: r.running,
              lastSyncedAt: r.lastSyncedAt,
              lastError: r.lastError,
            },
          ] as const;
        }),
      );
      setSyncStates((prev) => {
        const next = { ...prev };
        for (const [id, st] of entries) next[id as AnySource] = st;
        return next;
      });
      return true;
    },
  });

  useEffect(() => {
    return window.pond.onSourceStatus((update) => {
      qc.setQueryData<Record<AnySource, boolean> | undefined>(
        ["sources", "status"],
        (prev) => ({
          ...(prev ?? emptyStatus()),
          [update.source as AnySource]: update.connected,
        }),
      );
      if (update.connected) {
        toast.add({
          title: `Connected ${update.source}`,
          description: "Pond received your session from the browser extension.",
          type: "success",
        });
      }
    });
  }, [qc, toast]);

  useEffect(() => {
    return window.pond.onSyncStatus((u) => {
      setSyncStates((prev) => {
        const id = u.source as AnySource;
        const cur = prev[id] ?? {
          running: false,
          lastSyncedAt: null,
          lastError: null,
        };
        return {
          ...prev,
          [id]: {
            running: u.state === "running",
            lastSyncedAt: u.lastSyncedAt ?? cur.lastSyncedAt,
            lastError:
              u.state === "error" ? (u.lastError ?? cur.lastError) : null,
          },
        };
      });
    });
  }, []);

  const connectSource = useCallback(
    async (source: AnySource) => {
      setPendingSource(source);
      try {
        const res = await window.pond.connectSource(source);
        if (res.ok) {
          toast.add({
            title: `Sign in to ${source} in your browser`,
            description:
              "After signing in, open the Pond extension popup and click " +
              `"Push session". Pond will pick the cookies up automatically.`,
            type: "info",
          });
        } else {
          toast.add({ title: `Couldn't open ${source}`, type: "error" });
        }
      } catch {
        toast.add({ title: `Couldn't open ${source}`, type: "error" });
      } finally {
        setPendingSource(null);
      }
    },
    [toast],
  );

  const disconnect = useCallback(
    async (source: AnySource) => {
      setPendingSource(source);
      try {
        await window.pond.disconnectSource(source);
        await qc.invalidateQueries({ queryKey: ["sources", "status"] });
      } finally {
        setPendingSource(null);
      }
    },
    [qc],
  );

  const syncOne = useCallback(
    async (source: AnySource) => {
      const res = await window.pond.syncRunNow(source);
      if (!res.ok && res.reason === "already_running") {
        toast.add({ title: `${getSourceLabel(source)} is already syncing` });
      }
    },
    [toast],
  );

  const cancelOne = useCallback(async (source: AnySource) => {
    await window.pond.syncCancel(source);
  }, []);

  return (
    <section className={styles.section}>
      <h2 className={styles.heading}>Sources</h2>
      <Settings.List>
        {ALL_SOURCES.map((entry) => {
          const isConnected = connected[entry.id];
          const isPending = pendingSource === entry.id;
          const state = syncStates[entry.id];
          const subtitle = !isConnected
            ? SOURCE_DESCRIPTIONS[entry.id]
            : state.running
              ? "Syncing now\u2026"
              : state.lastError
                ? `Last sync failed: ${state.lastError}`
                : state.lastSyncedAt
                  ? `Last sync ${formatRelative(new Date(state.lastSyncedAt))}`
                  : "Never synced";
          return (
            <Fragment key={entry.id}>
              <Settings.Item>
                <Settings.ItemDetails>
                  <Settings.ItemTitle>{entry.label}</Settings.ItemTitle>
                  <Settings.ItemDescription>
                    {subtitle}
                  </Settings.ItemDescription>
                </Settings.ItemDetails>
                <Settings.ItemControl>
                  {!statusReady ? null : isConnected ? (
                    <div className={styles.actions}>
                      {state.running ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => void cancelOne(entry.id)}
                        >
                          Cancel
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => void syncOne(entry.id)}
                        >
                          Sync
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={isPending}
                        onClick={() => void disconnect(entry.id)}
                      >
                        Disconnect
                      </Button>
                    </div>
                  ) : (
                    <Button
                      size="sm"
                      disabled={isPending}
                      onClick={() => void connectSource(entry.id)}
                    >
                      {isPending ? "Opening\u2026" : "Sign in"}
                    </Button>
                  )}
                </Settings.ItemControl>
              </Settings.Item>
            </Fragment>
          );
        })}
      </Settings.List>
    </section>
  );
}
