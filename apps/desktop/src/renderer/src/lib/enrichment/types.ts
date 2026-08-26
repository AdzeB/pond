import type { Prefs } from "@pond/schema/db";
import type { Save } from "@/lib/types";

interface DerivedPatch {
  derived?: Record<string, unknown>;
  optimistic?: Partial<Save>;
}

export interface Enricher {
  id: string;
  dependsOn?: string[];
  hydrate?: () => Promise<void>;
  enabled: (prefs: Prefs | null) => boolean;
  eligible: (save: Save) => boolean;
  run: (save: Save) => Promise<DerivedPatch | null>;
}
