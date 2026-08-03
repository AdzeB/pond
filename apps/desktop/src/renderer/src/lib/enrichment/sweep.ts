import pLimit from "p-limit";
import type { Save } from "@/lib/types";
import { enrichmentMonitor } from "@/stores/enrichment-monitor";
import { onPoolDirty, pool, upsertSave } from "@/stores/pool";
import { getPrefsSnapshot } from "@/stores/prefs";
import { ENRICHERS, ENRICHERS_BY_ID } from "./registry";
import type { Enricher } from "./types";

/**
 * One background sweep drives every registered enricher: pLimit caps concurrent runs, inflight/failed are keyed `${enricherId}:${saveId}` so a failure retries only after restart or model upgrade, and pool updates coalesce into one debounced scan.
 * @remarks Dependency ordering is emergent: a dependent enricher is skipped while any enabled prerequisite is still eligible; completing a prerequisite updates the pool, which reschedules the scan.
 */

/** Models are CPU/GPU heavy and share the UI renderer; one-at-a-time keeps the sweep from starving interactive work. */
const limit = pLimit(1);
const inflight = new Set<string>();
const failed = new Set<string>();
/** Inference runs on the UI renderer; pause while hidden so it never burns CPU/GPU invisibly. */
let hidden = false;

/** No new runs while hidden; the in-flight run drains on its own. */
function suspended(): boolean {
  return hidden;
}

/** Throughput instrumentation: how fast the backlog drains and whether a model path (WebGPU vs WASM) pulls its weight; logged at `info` so it only shows with DevTools open. */
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
  if (stats.done % 10 === 0) {
    const avg = Math.round(stats.totalMs / stats.done);
    console.info(
      `[enrichment] progress done=${stats.done} inflight=${inflight.size} avg=${avg}ms ` +
        `last=${enricher.id} (${Math.round(ms)}ms)`,
    );
  }
}

/** Copies the sets so consumers can rely on referential change to re-render. */
function publishActivity(): void {
  enrichmentMonitor.set({
    inflight: inflight.size,
    activeKeys: new Set(inflight),
    failedKeys: new Set(failed),
  });
}

function keyFor(enricher: Enricher, save: Save): string {
  return `${enricher.id}:${save.id}`;
}

/**
 * Rest between runs so the CPU/GPU returns to idle instead of pinning at ~100% for the whole backlog; requestIdleCallback fires immediately on an idle machine, so heavy runs would otherwise go back-to-back.
 * @remarks Rest is ~50% of the run's own duration, clamped so quick runs still pause and long runs don't stall the backlog; pLimit(1) puts the gap between runs.
 */
const COOLDOWN_MIN_MS = 400;
const COOLDOWN_MAX_MS = 3000;
/** Battery runs rest longer so background enrichment doesn't drain an unplugged machine; defaults to plugged-in so unknown battery state never over-throttles. */
let onBattery = false;
const ON_BATTERY_COOLDOWN_FACTOR = 2.5;
function cooldown(lastRunMs: number): Promise<void> {
  if (suspended()) return Promise.resolve();
  const factor = onBattery ? ON_BATTERY_COOLDOWN_FACTOR : 1;
  const ms = Math.min(
    COOLDOWN_MAX_MS * factor,
    Math.max(COOLDOWN_MIN_MS * factor, lastRunMs * 0.5 * factor),
  );
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Yields to interactive work before a model run; the timeout caps starvation so the backlog still drains, and a macrotask stands in where requestIdleCallback is unavailable. */
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

/** True when every enabled prerequisite has already stamped this save. */
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
    /** Could not process this session; don't re-attempt until restart or model upgrade. */
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
  if (suspended()) return;
  const key = keyFor(enricher, save);
  if (inflight.has(key) || failed.has(key)) return;
  inflight.add(key);
  publishActivity();
  void limit(async () => {
    await whenIdle();
    if (suspended()) {
      inflight.delete(key);
      publishActivity();
      return;
    }
    const startedAt = performance.now();
    let elapsed = 0;
    try {
      await persist(enricher, save);
    } catch (err) {
      failed.add(key);
      console.warn(`[enrichment] ${enricher.id} failed for ${save.id}`, err);
    } finally {
      elapsed = performance.now() - startedAt;
      recordRun(enricher, elapsed);
      inflight.delete(key);
      publishActivity();
    }
    await cooldown(elapsed);
  });
}

/** No `ids` sweeps the whole library; a scope re-runs just those saves instead of draining the entire backlog. */
function scan(ids?: readonly string[]): void {
  if (suspended()) return;
  const prefs = getPrefsSnapshot();
  const scope = ids && ids.length > 0 ? new Set(ids) : null;
  /** Newest-first so fresh saves get captions/embeddings while the user is still looking at them. */
  const saves = [...pool.snapshot()]
    .filter((s) => !scope || scope.has(s.id))
    .sort((a, b) => b.savedAt - a.savedAt);
  /** Per-enricher count of outstanding work, a quick gauge of the on-device backlog. */
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
/** Scope carried by the pending debounced scan: `null` means full-library. A global request always wins over a scoped one landing in the same window. */
let pendingScope: Set<string> | null = null;
const FULL_SCAN_MS = 60_000;

function scheduleScan(ids?: readonly string[]): void {
  const scoped = ids && ids.length > 0 ? ids : null;
  if (scanScheduled) {
    if (!scoped) pendingScope = null;
    else if (pendingScope !== null)
      for (const id of scoped) pendingScope.add(id);
    return;
  }
  scanScheduled = true;
  pendingScope = scoped ? new Set(scoped) : null;
  /** Debounce bursts of pool updates, then run the scan during idle time. */
  setTimeout(() => {
    void whenIdle().then(() => {
      scanScheduled = false;
      const scope = pendingScope ? [...pendingScope] : undefined;
      pendingScope = null;
      scan(scope);
    });
  }, 250);
}

/**
 * Clears the per-session failure set so transient failures re-attempt, without resetting stamps, so already-enriched saves stay skipped.
 * @remarks Pass `ids` to scope both the failure-clear and the scan to a selection; omit for a library-wide rescan.
 */
export function rescanEnrichment(ids?: readonly string[]): void {
  if (ids && ids.length > 0) {
    const scope = new Set(ids);
    for (const key of failed) {
      if (scope.has(key.slice(key.indexOf(":") + 1))) failed.delete(key);
    }
    publishActivity();
    scheduleScan(ids);
    return;
  }
  failed.clear();
  publishActivity();
  scheduleScan();
}

/** Becoming visible kicks a fresh scan to resume any remaining backlog. */
function setHidden(next: boolean): void {
  if (hidden === next) return;
  hidden = next;
  if (!hidden) scheduleScan();
}

/** Idempotent; hydrates every enricher's persisted state first so a restart doesn't re-run the whole library. */
export function startEnrichmentSweep(): () => void {
  if (sweepStarted) return () => {};
  sweepStarted = true;
  const hydrations = ENRICHERS.filter((e) => e.hydrate).map((e) =>
    (e.hydrate as () => Promise<void>)().catch((err) => {
      console.warn(`[enrichment] hydrate failed (${e.id})`, err);
    }),
  );
  void Promise.all(hydrations).then(() => scheduleScan());
  /** Pool churn only rescans dirty ids; a periodic full scan catches dependency unlocks the dirty path misses. */
  const detachDirty = onPoolDirty((ids) => scheduleScan(ids));
  const fullScanTimer = setInterval(() => scheduleScan(), FULL_SCAN_MS);

  /** Pause while the window isn't on screen so inference never heats the machine invisibly. */
  let detachVisibility = (): void => {};
  if (typeof document !== "undefined") {
    hidden = document.hidden;
    const onVisibility = (): void => setHidden(document.hidden);
    document.addEventListener("visibilitychange", onVisibility);
    detachVisibility = () =>
      document.removeEventListener("visibilitychange", onVisibility);
  }

  /** The Battery Status API is absent on some platforms; when missing, stay in the plugged-in default and rely on the visibility gate. */
  let detachBattery = (): void => {};
  const getBattery = (
    navigator as Navigator & {
      getBattery?: () => Promise<EventTarget & { charging: boolean }>;
    }
  ).getBattery;
  if (typeof getBattery === "function") {
    void getBattery
      .call(navigator)
      .then((battery) => {
        const sync = (): void => {
          onBattery = !battery.charging;
        };
        sync();
        battery.addEventListener("chargingchange", sync);
        detachBattery = () =>
          battery.removeEventListener("chargingchange", sync);
      })
      .catch(() => {});
  }

  return () => {
    detachDirty();
    clearInterval(fullScanTimer);
    detachVisibility();
    detachBattery();
  };
}
