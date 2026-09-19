import type { Prefs } from "@pond/schema/db";
import type { Save } from "@/features/saves/types";

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
  sensitiveScore?: number | null;
  sensitiveModel?: string | null;
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
