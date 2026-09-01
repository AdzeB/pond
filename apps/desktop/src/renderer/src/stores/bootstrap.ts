import { Store } from "@tanstack/store";
import { z } from "zod";
import {
  normalise,
  type SavePatch,
  SavePatchesSchema,
  SyncActionEventSchema,
} from "@/lib/save/reconcile";
import { readSnapshot, scheduleSnapshotWrite } from "@/lib/save/snapshot";
import { applyActionCoalesced } from "@/lib/save/sync-coalesce";
import type { Save } from "@/lib/types";
import { dismissBootCover } from "@/lib/ui/boot-cover";
import { bulkUpsertSaves, deleteSave, pool } from "@/stores/pool";

const SNAPSHOT_TIMEOUT_MS = 2_000;
const FIRST_PAGE_TIMEOUT_MS = 4_000;

type SavePageCursor = {
  readonly savedAt: number;
  readonly id: string;
};

interface PagingState {
  readonly ready: boolean;
  readonly loading: boolean;
  readonly loaded: number;
  readonly total: number;
  readonly nextCursor: SavePageCursor | null;
  readonly hasMore: boolean;
}

export const pagingStore = new Store<PagingState>({
  ready: false,
  loading: false,
  loaded: 0,
  total: 0,
  nextCursor: null,
  hasMore: true,
});

function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  label: string,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`${label} timed out after ${ms}ms`));
    }, ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      },
    );
  });
}

const PAGE_SIZE = 250;

let started = false;
let bootPromise: Promise<void> | null = null;
let pageInflight: Promise<void> | null = null;
let fullPoolInflight: Promise<void> | null = null;

export function bootPool(): Promise<void> {
  if (bootPromise) return bootPromise;
  if (started) return Promise.resolve();
  started = true;

  bootPromise = (async () => {
    try {
      subscribeToSyncActions();
    } catch (err) {
      console.warn("[pond pool] sync subscribe failed", err);
    }
    try {
      await withTimeout(primeSnapshot(), SNAPSHOT_TIMEOUT_MS, "snapshot prime");
    } catch (err) {
      console.warn("[pond pool] snapshot prime failed", err);
    }

    try {
      await withTimeout(
        loadNextPage(),
        FIRST_PAGE_TIMEOUT_MS,
        "initial page hydrate",
      );
    } catch (err) {
      console.warn("[pond pool] initial page hydrate failed", err);
    }
    scheduleSnapshotWrite();
    pagingStore.setState((state) => ({ ...state, ready: true }));
    dismissBootCover();
  })();

  return bootPromise;
}

async function primeSnapshot(): Promise<void> {
  const cached = await readSnapshot();
  const usable = cached.filter((row) => row?.url);
  applyListRows(usable.slice(0, PAGE_SIZE));
}

export function loadNextPage(): Promise<void> {
  if (fullPoolInflight) return fullPoolInflight;
  if (pageInflight) return pageInflight;
  if (!pagingStore.state.hasMore) return Promise.resolve();

  pageInflight = fetchPage(pagingStore.state.nextCursor).finally(() => {
    pageInflight = null;
  });
  return pageInflight;
}

export function hydrateFullPool(): Promise<void> {
  if (fullPoolInflight) return fullPoolInflight;
  if (!pagingStore.state.hasMore) return Promise.resolve();

  fullPoolInflight = (async () => {
    const activePage = pageInflight;
    if (activePage) {
      try {
        await activePage;
      } catch {}
    }

    pagingStore.setState((state) => ({ ...state, loading: true }));
    const rows = SavePatchesSchema.parse(
      await window.pond.query("saves.list", {}),
    );
    const fresh = applyListRows(rows, { pruneMissing: true });
    scheduleSnapshotWrite();
    pagingStore.setState((state) => ({
      ...state,
      loaded: fresh.length,
      total: fresh.length,
      nextCursor: null,
      hasMore: false,
    }));
  })().finally(() => {
    fullPoolInflight = null;
    pagingStore.setState((state) => ({ ...state, loading: false }));
  });

  return fullPoolInflight;
}

const SavePageSchema = z.object({
  rows: SavePatchesSchema.catch([]),
  nextCursor: z
    .object({ savedAt: z.number(), id: z.string() })
    .nullish()
    .catch(null),
  total: z.number().nullish().catch(null),
});

async function fetchPage(cursor: SavePageCursor | null): Promise<void> {
  pagingStore.setState((state) => ({ ...state, loading: true }));
  try {
    const params = cursor ? { limit: PAGE_SIZE, cursor } : { limit: PAGE_SIZE };
    const page = SavePageSchema.parse(
      await window.pond.query("saves.listPage", params),
    );
    const fresh = applyListRows(page.rows);
    const nextCursor = page.nextCursor ?? null;
    pagingStore.setState((state) => ({
      ...state,
      loaded: state.loaded + fresh.length,
      total:
        page.total != null && Number.isFinite(page.total)
          ? page.total
          : state.total,
      nextCursor,
      hasMore: nextCursor !== null,
    }));
  } finally {
    pagingStore.setState((state) => ({ ...state, loading: false }));
  }
}

function applyListRows(
  rows: Array<SavePatch | null>,
  opts: { pruneMissing?: boolean } = {},
): Save[] {
  const fresh = rows
    .map((row) => normalise(row))
    .filter((r): r is Save => r !== null);
  if (opts.pruneMissing) {
    const freshIds = new Set(fresh.map((save) => save.id));
    for (const id of pool.ids()) {
      if (!freshIds.has(id)) deleteSave(id);
    }
  }
  bulkUpsertSaves(fresh);
  return fresh;
}

let subscribedToSync = false;

function subscribeToSyncActions(): void {
  if (subscribedToSync) return;
  window.pond.onSyncAction((raw) => {
    try {
      const event = SyncActionEventSchema.safeParse(raw);
      if (event.success) applyActionCoalesced(event.data);
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
