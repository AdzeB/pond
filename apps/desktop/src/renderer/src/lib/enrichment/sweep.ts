import pLimit from "p-limit";
import type { Save } from "@/lib/types";
import { enrichmentMonitor } from "@/stores/enrichment-monitor";
import { pool, savesStore, upsertSave } from "@/stores/pool";
import { getPrefsSnapshot } from "@/stores/prefs";
import { ENRICHERS, ENRICHERS_BY_ID } from "./registry";
import type { Enricher } from "./types";

// Generalized on-device enrichment scheduler. One background sweep drives every
// registered enricher, reusing the concurrency/dedupe/debounce mechanics of the
// old NSFW + embedding sweeps:
//   - pLimit caps concurrent model runs across all enrichers
//   - inflight/failed are keyed `${enricher.id}:${save.id}` so a failure is
//     retried only after a restart or model upgrade (eligibility-by-stamp)
//   - pool updates are coalesced into one debounced scan
// Dependency ordering is emergent: a dependent enricher is skipped for a save
// while any of its (enabled) prerequisites is still eligible; completing a
// prerequisite optimistically updates the pool, which reschedules the scan.

// Cap on-device model work to a single concurrent run. These models are CPU/GPU
// heavy and share the UI renderer; one-at-a-time keeps the sweep from starving
// interactive work. (Raise only if inference moves off the UI thread.)
const limit = pLimit(1);
const inflight = new Set<string>();
const failed = new Set<string>();
// User-controlled stop: when paused, no new enricher runs are scheduled;
// in-flight runs finish naturally.
let paused = false;

// Lightweight throughput instrumentation so we can see how fast the on-device
// backlog drains and whether a model path (WebGPU vs WASM) is pulling its
// weight. Logged at `info`, so it only shows with DevTools open.
const stats = {
  done: 0,
  totalMs: 0,
  byEnricher: new Map<string, { done: number; ms: number }>(),
};

function recordRun(enricher: Enricher, ms: number): void {
  stats.done += 1;
  stats.totalMs += ms;
  const e = stats.byEnricher.get(enricher.id) ?? { done: 0, ms: 0 };
  e.done += 1;
  e.ms += ms;
  stats.byEnricher.set(enricher.id, e);
  // Summarize every 10 completions to keep the console readable on big libraries.
  if (stats.done % 10 === 0) {
    const avg = Math.round(stats.totalMs / stats.done);
    console.info(
      `[enrichment] progress done=${stats.done} inflight=${inflight.size} avg=${avg}ms ` +
        `last=${enricher.id} (${Math.round(ms)}ms)`,
    );
  }
}

function reportInflight(): void {
  enrichmentMonitor.set({ inflight: inflight.size });
}

function keyFor(enricher: Enricher, save: Save): string {
  return `${enricher.id}:${save.id}`;
}

// Wait for the renderer to be idle before kicking off a model run, so enrichment
// always yields to interactive work. Falls back to a macrotask where
// requestIdleCallback is unavailable. The timeout caps starvation when the user
// keeps the app busy, so the backlog still drains.
function whenIdle(timeout = 2000): Promise<void> {
  return new Promise((resolve) => {
    const ric = (
      globalThis as {
        requestIdleCallback?: (
          cb: () => void,
          opts?: { timeout: number },
        ) => void;
      }
    ).requestIdleCallback;
    if (typeof ric === "function") ric(() => resolve(), { timeout });
    else setTimeout(resolve, 0);
  });
}

// True when every enabled prerequisite has already stamped this save.
function dependenciesSatisfied(
  enricher: Enricher,
  save: Save,
  prefs: ReturnType<typeof getPrefsSnapshot>,
): boolean {
  if (!enricher.dependsOn) return true;
  for (const depId of enricher.dependsOn) {
    const dep = ENRICHERS_BY_ID.get(depId);
    if (!dep) continue;
    if (dep.enabled(prefs) && dep.eligible(save)) return false;
  }
  return true;
}

async function persist(enricher: Enricher, save: Save): Promise<void> {
  const result = await enricher.run(save);
  if (result == null) {
    // Could not process this session; don't re-attempt until restart/upgrade.
    failed.add(keyFor(enricher, save));
    return;
  }
  if (result.optimistic) {
    const current = pool.get(save.id);
    if (current) upsertSave({ ...current, ...result.optimistic });
  }
  if (result.derived && Object.keys(result.derived).length > 0) {
    try {
      await window.pond.query("saves.patchDerived", {
        id: save.id,
        patch: result.derived,
      });
    } catch (err) {
      console.warn(`[enrichment] persist failed (${enricher.id})`, err);
    }
  }
}

function schedule(enricher: Enricher, save: Save): void {
  if (paused) return;
  const key = keyFor(enricher, save);
  if (inflight.has(key) || failed.has(key)) return;
  inflight.add(key);
  reportInflight();
  void limit(async () => {
    // Yield to the UI before claiming the CPU/GPU for this run.
    await whenIdle();
    if (paused) {
      inflight.delete(key);
      reportInflight();
      return;
    }
    const startedAt = performance.now();
    try {
      await persist(enricher, save);
    } catch (err) {
      failed.add(key);
      console.warn(`[enrichment] ${enricher.id} failed for ${save.id}`, err);
    } finally {
      recordRun(enricher, performance.now() - startedAt);
      inflight.delete(key);
      reportInflight();
    }
  });
}

function scan(): void {
  if (paused) return;
  const prefs = getPrefsSnapshot();
  // Newest-first: enrich what the user just saved before grinding old backlog,
  // so fresh items get captions/embeddings while they're still looking at them.
  const saves = [...pool.snapshot()].sort((a, b) => b.savedAt - a.savedAt);
  // Per-enricher count of work still outstanding this pass — a quick gauge of
  // how big the on-device backlog is right now.
  const backlog: string[] = [];
  for (const enricher of ENRICHERS) {
    if (!enricher.enabled(prefs)) continue;
    let eligible = 0;
    for (const save of saves) {
      if (!enricher.eligible(save)) continue;
      eligible += 1;
      if (!dependenciesSatisfied(enricher, save, prefs)) continue;
      schedule(enricher, save);
    }
    if (eligible > 0) backlog.push(`${enricher.id}=${eligible}`);
  }
  if (backlog.length > 0) {
    console.info(
      `[enrichment] scan backlog ${backlog.join(" ")} (inflight=${inflight.size})`,
    );
  }
}

let sweepStarted = false;
let scanScheduled = false;

function scheduleScan(): void {
  if (scanScheduled) return;
  scanScheduled = true;
  // Debounce bursts of pool updates, then run the scan during idle time.
  setTimeout(() => {
    void whenIdle().then(() => {
      scanScheduled = false;
      scan();
    });
  }, 250);
}

// Retry failed runs and pick up newly-enabled enrichers immediately. Clears the
// per-session failure set so transient failures (offline model load) re-attempt;
// does not reset stamps, so already-enriched saves are skipped by eligibility.
export function rescanEnrichment(): void {
  failed.clear();
  scheduleScan();
}

// Stop scheduling new enricher runs; in-flight runs drain on their own.
export function pauseEnrichmentSweep(): void {
  if (paused) return;
  paused = true;
  enrichmentMonitor.set({ paused: true });
}

export function resumeEnrichmentSweep(): void {
  if (!paused) return;
  paused = false;
  enrichmentMonitor.set({ paused: false });
  scheduleScan();
}

// Begin the background enrichment sweep. Idempotent. Hydrates every enricher's
// persisted state first (vectors), so a restart doesn't re-run the whole library.
export function startEnrichmentSweep(): () => void {
  if (sweepStarted) return () => {};
  sweepStarted = true;
  const hydrations = ENRICHERS.filter((e) => e.hydrate).map((e) =>
    (e.hydrate as () => Promise<void>)().catch((err) => {
      console.warn(`[enrichment] hydrate failed (${e.id})`, err);
    }),
  );
  void Promise.all(hydrations).then(scheduleScan);
  const sub = savesStore.subscribe(scheduleScan);
  return () => sub.unsubscribe();
}
