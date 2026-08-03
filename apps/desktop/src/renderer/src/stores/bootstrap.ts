import { Store } from "@tanstack/store";
import { normalise, type SyncActionEvent } from "@/lib/save/reconcile";
import { readSnapshot, scheduleSnapshotWrite } from "@/lib/save/snapshot";
import { applyActionCoalesced } from "@/lib/save/sync-coalesce";
import type { Save } from "@/lib/types";
import { bulkUpsertSaves, deleteSave, pool } from "@/stores/pool";

interface BootState {
  readonly ready: boolean;
}

export const bootStore = new Store<BootState>({ ready: false });

/** Newest N rows paint first; the remainder hydrates in the background. */
const HOT_SET_LIMIT = 5_000;

let started = false;
let bootPromise: Promise<void> | null = null;

export function bootPool(): Promise<void> {
  if (bootPromise) return bootPromise;
  if (started) return Promise.resolve();
  started = true;

  bootPromise = (async () => {
    subscribeToSyncActions();

    /** Paint from the cached snapshot before the hydrate returns; hydrateFromMain reconciles stale rows. */
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
      await hydrateHotSet();
    } catch (err) {
      console.warn("[pond pool] hot-set hydrate failed", err);
    }
    scheduleSnapshotWrite();
    bootStore.setState(() => ({ ready: true }));

    try {
      await hydrateRemainder();
      scheduleSnapshotWrite();
    } catch (err) {
      console.warn("[pond pool] full hydrate failed", err);
    }
  })();

  return bootPromise;
}

async function hydrateHotSet(): Promise<void> {
  const rows = (await window.pond.query("saves.list", {
    limit: HOT_SET_LIMIT,
  })) as Array<Partial<Save>>;
  applyListRows(rows, { pruneMissing: false });
}

async function hydrateRemainder(): Promise<void> {
  const rows = (await window.pond.query("saves.list", {})) as Array<
    Partial<Save>
  >;
  applyListRows(rows, { pruneMissing: true });
}

function applyListRows(
  rows: Array<Partial<Save>>,
  opts: { pruneMissing: boolean },
): void {
  const fresh = rows
    .map((row) => normalise(row))
    .filter((r): r is Save => r !== null);

  if (opts.pruneMissing) {
    const freshIds = new Set(fresh.map((s) => s.id));
    const stale: string[] = [];
    for (const id of pool.ids()) {
      if (!freshIds.has(id)) stale.push(id);
    }
    for (const id of stale) deleteSave(id);
  }

  bulkUpsertSaves(fresh);
}

let subscribedToSync = false;

function subscribeToSyncActions(): void {
  if (subscribedToSync) return;
  window.pond.onSyncAction((raw) => {
    try {
      applyActionCoalesced(raw as SyncActionEvent);
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
