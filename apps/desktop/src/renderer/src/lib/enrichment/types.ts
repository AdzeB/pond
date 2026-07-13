import type { Prefs } from "@pond/schema/db";
import type { Save } from "@/lib/types";

interface DerivedPatch {
  /** Whitelisted AI columns to persist (non-synced) via `saves.patchDerived`. */
  derived?: Record<string, unknown>;
  /** Fields merged into the pooled save immediately so the UI reacts now. */
  optimistic?: Partial<Save>;
}

/** One on-device enrichment unit; the sweep runs every enabled enricher over each eligible save, respecting `dependsOn`. */
export interface Enricher {
  /** Stable identifier, also the dependency key. */
  id: string;
  /** Enrichers that must have stamped a save before this one is scheduled. */
  dependsOn?: string[];
  /** One-time hydration of persisted state before the first scan, so a restart doesn't re-run the whole library. */
  hydrate?: () => Promise<void>;
  enabled: (prefs: Prefs | null) => boolean;
  /** Returning false means "done or not applicable". */
  eligible: (save: Save) => boolean;
  /** Returning null marks the save failed for this session; enrichers may instead persist through their own store and return an empty patch. */
  run: (save: Save) => Promise<DerivedPatch | null>;
}
