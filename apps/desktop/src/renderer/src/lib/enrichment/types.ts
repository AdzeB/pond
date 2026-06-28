import type { Prefs } from "@pond/schema/db";
import type { Save } from "@/lib/types";

// One on-device enrichment unit. The scheduler (lib/enrichment/sweep.ts) runs
// every enabled enricher over each eligible save, respecting `dependsOn` so an
// enricher only fires once its prerequisites have stamped the save.
//
// `run` may either return a `DerivedPatch` (the scheduler persists it via
// `saves.patchDerived` and/or optimistically into the pool) or persist through
// its own store (embeddings, clip vectors) and return an empty patch. Returning
// `null` marks the save failed for this session (retried after a model upgrade
// or restart).
export interface DerivedPatch {
  // Whitelisted AI columns to persist (non-synced) via `saves.patchDerived`.
  derived?: Record<string, unknown>;
  // Fields to merge into the pooled save immediately so the UI reacts now.
  optimistic?: Partial<Save>;
}

export interface Enricher {
  // Stable identifier (also the dependency key).
  id: string;
  // Enrichers that must have run for a save before this one is scheduled.
  dependsOn?: string[];
  // Optional one-time hydration (e.g. load persisted vectors) before the first
  // scan, so a restart doesn't re-run the whole library.
  hydrate?: () => Promise<void>;
  // Whether the enricher is turned on given current prefs.
  enabled: (prefs: Prefs | null) => boolean;
  // Whether this specific save still needs the enricher (null/stale stamp,
  // correct media type, etc). Returning false means "done or not applicable".
  eligible: (save: Save) => boolean;
  // Produce the enrichment for one save.
  run: (save: Save) => Promise<DerivedPatch | null>;
}
