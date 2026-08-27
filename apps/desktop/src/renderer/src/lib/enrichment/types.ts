import type { Prefs } from "@pond/schema/db";
import type { Save } from "@/lib/types";

/** The `saves` columns an enricher may write back; mirrors `saves.patchDerived`'s schema in main. */
export type DerivedFields = {
  caption?: string | null;
  captionModel?: string | null;
  ocrText?: string | null;
  ocrModel?: string | null;
  transcript?: string | null;
  transcriptModel?: string | null;
  clipEmbedding?: number[] | null;
  clipModel?: string | null;
  aesthetic?: string[] | null;
  aestheticModel?: string | null;
  autoTitleModel?: string | null;
  suggestedTags?: string[] | null;
  suggestedTagsModel?: string | null;
};

interface DerivedPatch {
  derived?: DerivedFields;
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
