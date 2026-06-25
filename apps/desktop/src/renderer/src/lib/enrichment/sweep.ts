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

const limit = pLimit(2);
const inflight = new Set<string>();
const failed = new Set<string>();
// User-controlled stop: when paused, no new enricher runs are scheduled;
// in-flight runs finish naturally.
let paused = false;

function reportInflight(): void {
  enrichmentMonitor.set({ inflight: inflight.size });
}

function keyFor(enricher: Enricher, save: Save): string {
  return `${enricher.id}:${save.id}`;
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
    try {
      await persist(enricher, save);
    } catch (err) {
      failed.add(key);
      console.warn(`[enrichment] ${enricher.id} failed for ${save.id}`, err);
    } finally {
      inflight.delete(key);
      reportInflight();
    }
  });
}

function scan(): void {
  if (paused) return;
  const prefs = getPrefsSnapshot();
  const saves = pool.snapshot();
  for (const enricher of ENRICHERS) {
    if (!enricher.enabled(prefs)) continue;
    for (const save of saves) {
      if (!enricher.eligible(save)) continue;
      if (!dependenciesSatisfied(enricher, save, prefs)) continue;
      schedule(enricher, save);
    }
  }
}

let sweepStarted = false;
let scanScheduled = false;

function scheduleScan(): void {
  if (scanScheduled) return;
  scanScheduled = true;
  setTimeout(() => {
    scanScheduled = false;
    scan();
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
