import { join } from "node:path";
import { SOURCES, type Source } from "@pond/schema/db";
import { BrowserWindow, session } from "electron";
import { acquire } from "../../pipeline/rate-governor";
import { PARTITION } from "./constants";

/** Hard ceiling on live scrape windows (~150 MB each). */
export const GLOBAL_POOL_CAP = 6;

/** Idle windows keep a heavy SPA resident in a full renderer process; blank on release and tear down after this grace so a finished sync doesn't pin CPU/memory. */
const IDLE_EVICT_MS = 60_000;

/** Per-source budgets deliberately sum past the global cap to prevent head-of-line blocking. */
const PER_SOURCE_CAP: Record<Source, number> = {
  twitter: 3,
  instagram: 2,
  tiktok: 2,
  youtube: 2,
  cosmos: 2,
  pinterest: 2,
  arena: 2,
  reddit: 2,
  threads: 2,
  /** Web links fetch over HTTP without a window; present only to complete the record. */
  web: 0,
  /** Local never leases a window; present only to complete the record. */
  local: 0,
};

interface PoolSlot {
  win: BrowserWindow;
  /** Session partition the window was created on; immutable per window, so serving another account means replacing the window. */
  partition: string;
  busy: boolean;
  source: Source | null;
  evictTimer: ReturnType<typeof setTimeout> | null;
}

interface Waiter {
  partition: string;
  resolve: (slot: PoolSlot) => void;
}

const pool: PoolSlot[] = [];
const busyBySource: Record<Source, number> = Object.fromEntries(
  SOURCES.map((s) => [s, 0]),
) as Record<Source, number>;
const waitQueues: Record<Source, Waiter[]> = Object.fromEntries(
  SOURCES.map((s) => [s, [] as Waiter[]]),
) as Record<Source, Waiter[]>;
/** Round-robin cursor so a hot queue can't monopolise released slots. */
let roundRobinCursor = 0;

function createHiddenWindow(partition: string): BrowserWindow {
  const persistent = session.fromPartition(partition);
  persistent.setUserAgent(
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/537.36 " +
      "(KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
  );

  const win = new BrowserWindow({
    show: false,
    width: 1280,
    height: 1024,
    webPreferences: {
      session: persistent,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      preload: join(__dirname, "../preload/scrape.cjs"),
      plugins: false,
      webgl: false,
      autoplayPolicy: "document-user-activation-required",
    },
  });
  win.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  win.webContents.setAudioMuted(true);
  win.on("closed", () => {
    const idx = pool.findIndex((s) => s.win === win);
    if (idx !== -1) pool.splice(idx, 1);
  });
  return win;
}

interface Lease {
  win: BrowserWindow;
  release: () => void;
}

function cancelEviction(slot: PoolSlot): void {
  if (slot.evictTimer) {
    clearTimeout(slot.evictTimer);
    slot.evictTimer = null;
  }
}

/** Drops the heavy page so an idle window stops running its timers, then arms a teardown so a fully idle pool releases its renderer processes. */
function blankAndScheduleEviction(slot: PoolSlot): void {
  cancelEviction(slot);
  if (slot.win.isDestroyed()) return;
  void slot.win.loadURL("about:blank").catch(() => {});
  slot.evictTimer = setTimeout(() => {
    slot.evictTimer = null;
    if (!slot.busy && !slot.win.isDestroyed()) slot.win.destroy();
  }, IDLE_EVICT_MS);
  /** Never let the eviction timer keep the process alive on its own. */
  slot.evictTimer.unref?.();
}

function claimSlot(slot: PoolSlot, source: Source): Lease {
  cancelEviction(slot);
  slot.busy = true;
  slot.source = source;
  busyBySource[source] += 1;
  let released = false;
  return {
    win: slot.win,
    release: () => {
      if (released) return;
      released = true;
      slot.busy = false;
      slot.source = null;
      busyBySource[source] = Math.max(0, busyBySource[source] - 1);
      drainQueues();
      /** If a waiter didn't immediately re-claim the slot, free its page. */
      if (!slot.busy) blankAndScheduleEviction(slot);
    },
  };
}

interface LeaseOptions {
  /** Apply the stricter first/full-sync pacing profile. */
  firstSync?: boolean;
  /** Abort the governor wait (e.g. on sync cancel). */
  signal?: AbortSignal;
  /** Session partition the leased window must run on; defaults to the legacy shared partition. */
  partition?: string;
}

/** A window's session is fixed at creation, so an idle slot on the wrong partition gets its window swapped rather than reused. */
function retargetSlot(slot: PoolSlot, partition: string): void {
  if (slot.partition === partition) return;
  const old = slot.win;
  slot.win = createHiddenWindow(partition);
  slot.partition = partition;
  if (!old.isDestroyed()) old.destroy();
}

export async function leaseWindow(
  source: Source,
  opts: LeaseOptions = {},
): Promise<Lease> {
  const partition = opts.partition ?? PARTITION;
  /** Acquire from the governor before claiming a slot, so a paused source never pins a pool window. */
  await acquire(source, { firstSync: opts.firstSync, signal: opts.signal });
  if (busyBySource[source] >= PER_SOURCE_CAP[source]) {
    return new Promise<Lease>((resolve) => {
      waitQueues[source].push({
        partition,
        resolve: (slot) => resolve(claimSlot(slot, source)),
      });
    });
  }
  /** Prefer an idle slot already on the right partition to keep its page cache. */
  const idle =
    pool.find(
      (s) => !s.busy && !s.win.isDestroyed() && s.partition === partition,
    ) ?? pool.find((s) => !s.busy && !s.win.isDestroyed());
  if (idle) {
    retargetSlot(idle, partition);
    return claimSlot(idle, source);
  }
  if (pool.length < GLOBAL_POOL_CAP) {
    const win = createHiddenWindow(partition);
    const slot: PoolSlot = {
      win,
      partition,
      busy: false,
      source: null,
      evictTimer: null,
    };
    pool.push(slot);
    return claimSlot(slot, source);
  }
  return new Promise<Lease>((resolve) => {
    waitQueues[source].push({
      partition,
      resolve: (slot) => resolve(claimSlot(slot, source)),
    });
  });
}

/** Round-robin, one grant per source per pass, until nothing can be served. */
function drainQueues(): void {
  let progress = true;
  while (progress) {
    progress = false;
    for (let i = 0; i < SOURCES.length; i += 1) {
      const source = SOURCES[(roundRobinCursor + i) % SOURCES.length];
      if (!source) continue;
      const queue = waitQueues[source];
      if (queue.length === 0) continue;
      if (busyBySource[source] >= PER_SOURCE_CAP[source]) continue;
      const next = queue[0];
      if (!next) continue;
      const idle =
        pool.find(
          (s) =>
            !s.busy && !s.win.isDestroyed() && s.partition === next.partition,
        ) ?? pool.find((s) => !s.busy && !s.win.isDestroyed());
      if (!idle) return;
      queue.shift();
      retargetSlot(idle, next.partition);
      next.resolve(idle);
      roundRobinCursor = (SOURCES.indexOf(source) + 1) % SOURCES.length;
      progress = true;
    }
  }
}

export function disposeHiddenWindow(): void {
  for (const slot of pool) {
    cancelEviction(slot);
    if (!slot.win.isDestroyed()) slot.win.destroy();
  }
  pool.length = 0;
  for (const source of SOURCES) {
    waitQueues[source].length = 0;
    busyBySource[source] = 0;
  }
}
