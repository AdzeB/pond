import { join } from "node:path";
import { SOURCES, type Source } from "@pond/schema/db";
import { BrowserWindow, session } from "electron";
import log from "electron-log/main.js";
import { sourcePausedUntil } from "../../pipeline/source-gate";
import { PARTITION } from "./constants";
import { sleep } from "./util";

// Hard ceiling on total scrape windows alive at once. Each hidden
// window is ~150 MB resident; six is the comfortable upper bound on a
// laptop without leaning on swap.
export const GLOBAL_POOL_CAP = 6;

// Per-source concurrency budget. Caps sum to more than GLOBAL_POOL_CAP
// on purpose: the global cap clamps memory while these per-source
// budgets prevent head-of-line blocking when a host stalls (X under
// soft-block can pin its slots until the nav timeout). Twitter gets
// the largest slice because `harvest_metadata` + `capture_tweet` both
// target it.
const PER_SOURCE_CAP: Record<Source, number> = {
  twitter: 3,
  instagram: 2,
  tiktok: 2,
  youtube: 2,
  cosmos: 2,
  pinterest: 2,
  arena: 2,
  // Local imports never lease a scrape window; the budget is here only to
  // keep the record total.
  local: 0,
};

interface PoolSlot {
  win: BrowserWindow;
  busy: boolean;
  source: Source | null;
}

interface Waiter {
  resolve: (slot: PoolSlot) => void;
}

const pool: PoolSlot[] = [];
const busyBySource: Record<Source, number> = Object.fromEntries(
  SOURCES.map((s) => [s, 0]),
) as Record<Source, number>;
const waitQueues: Record<Source, Waiter[]> = Object.fromEntries(
  SOURCES.map((s) => [s, [] as Waiter[]]),
) as Record<Source, Waiter[]>;
// Cursor for round-robin drain order. Advances past the source we just
// served so a hot queue can't monopolise freshly released slots.
let roundRobinCursor = 0;

function createHiddenWindow(): BrowserWindow {
  const persistent = session.fromPartition(PARTITION);
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

export interface Lease {
  win: BrowserWindow;
  release: () => void;
}

function claimSlot(slot: PoolSlot, source: Source): Lease {
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
    },
  };
}

export async function leaseWindow(source: Source): Promise<Lease> {
  // Honour an active per-source cooldown / circuit-breaker. Without
  // this gate, a soft-blocked host keeps re-leasing windows the moment
  // the previous task fails, and every call burns its full nav timeout
  // before the reconciler can even classify the error. Sleep until the
  // gate clears, then fall through to the normal claim path. The gate
  // is in-memory and clears whenever the source recovers.
  const pausedUntil = sourcePausedUntil(source);
  if (pausedUntil > 0) {
    const waitMs = Math.max(0, pausedUntil - Date.now());
    if (waitMs > 0) {
      log.info("[pond refresh:window] source paused, deferring lease", {
        source,
        waitMs,
      });
      await sleep(waitMs);
    }
  }
  if (busyBySource[source] >= PER_SOURCE_CAP[source]) {
    return new Promise<Lease>((resolve) => {
      waitQueues[source].push({
        resolve: (slot) => resolve(claimSlot(slot, source)),
      });
    });
  }
  const idle = pool.find((s) => !s.busy && !s.win.isDestroyed());
  if (idle) {
    return claimSlot(idle, source);
  }
  if (pool.length < GLOBAL_POOL_CAP) {
    const win = createHiddenWindow();
    const slot: PoolSlot = { win, busy: false, source: null };
    pool.push(slot);
    return claimSlot(slot, source);
  }
  return new Promise<Lease>((resolve) => {
    waitQueues[source].push({
      resolve: (slot) => resolve(claimSlot(slot, source)),
    });
  });
}

function drainQueues(): void {
  // Round-robin across sources, one grant per source per pass. Loop
  // until no source can be served: either everyone with a waiter is
  // already at cap or no windows are idle.
  let progress = true;
  while (progress) {
    progress = false;
    for (let i = 0; i < SOURCES.length; i += 1) {
      const source = SOURCES[(roundRobinCursor + i) % SOURCES.length];
      if (!source) continue;
      const queue = waitQueues[source];
      if (queue.length === 0) continue;
      if (busyBySource[source] >= PER_SOURCE_CAP[source]) continue;
      const idle = pool.find((s) => !s.busy && !s.win.isDestroyed());
      if (!idle) return;
      const next = queue.shift();
      if (!next) continue;
      next.resolve(idle);
      roundRobinCursor = (SOURCES.indexOf(source) + 1) % SOURCES.length;
      progress = true;
    }
  }
}

export function disposeHiddenWindow(): void {
  for (const slot of pool) {
    if (!slot.win.isDestroyed()) slot.win.destroy();
  }
  pool.length = 0;
  for (const source of SOURCES) {
    waitQueues[source].length = 0;
    busyBySource[source] = 0;
  }
}
