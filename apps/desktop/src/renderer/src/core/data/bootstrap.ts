import { Store } from "@tanstack/store";
import { bulkUpsertSaves, deleteSave, pool } from "./pool";
import { applyAction, normalise, type SyncActionEvent } from "./reconcile";
import { readSnapshot, scheduleSnapshotWrite } from "./snapshot";
import type { Save } from "./types";

interface BootState {
  readonly ready: boolean;
}

export const bootStore = new Store<BootState>({ ready: false });

let started = false;
let bootPromise: Promise<void> | null = null;

export function bootPool(): Promise<void> {
  if (bootPromise) return bootPromise;
  if (started) return Promise.resolve();
  started = true;

  bootPromise = (async () => {
    subscribeToSyncActions();

    // Paint from the cached snapshot before the hydrate returns; hydrateFromMain reconciles stale rows.
    try {
      const cached = await readSnapshot();
      if (cached.length > 0) {
        const normalised = cached
          .map((row) => normalise(row))
          .filter((r): r is Save => r !== null);
        if (normalised.length > 0) {
          bulkUpsertSaves(normalised);
        }
      }
    } catch (err) {
      console.warn("[pond pool] snapshot prime failed", err);
    }

    try {
      await hydrateFromMain();
    } catch (err) {
      console.warn("[pond pool] hydrate failed", err);
    }
    scheduleSnapshotWrite();

    bootStore.setState(() => ({ ready: true }));
  })();

  return bootPromise;
}

async function hydrateFromMain(): Promise<void> {
  const rows = (await window.pond.query("saves.list", {})) as Array<
    Partial<Save>
  >;
  const fresh = rows
    .map((row) => normalise(row))
    .filter((r): r is Save => r !== null);

  const freshIds = new Set(fresh.map((s) => s.id));
  const stale: string[] = [];
  for (const id of pool.ids()) {
    if (!freshIds.has(id)) stale.push(id);
  }

  bulkUpsertSaves(fresh);
  for (const id of stale) deleteSave(id);
}

let subscribedToSync = false;

function subscribeToSyncActions(): void {
  if (subscribedToSync) return;
  window.pond.onSyncAction((raw) => {
    try {
      applyAction(raw as SyncActionEvent);
      scheduleSnapshotWrite();
    } catch (err) {
      console.warn("[pond pool] applyAction failed", err, raw);
    }
  });
  subscribedToSync = true;
}

export async function optimistic<T>(
  optimisticUpdate: () => void,
  rollback: () => void,
  run: () => Promise<T>,
): Promise<T | null> {
  optimisticUpdate();
  try {
    return await run();
  } catch (err) {
    console.warn("[pond pool] tx failed, rolling back", err);
    rollback();
    return null;
  }
}
