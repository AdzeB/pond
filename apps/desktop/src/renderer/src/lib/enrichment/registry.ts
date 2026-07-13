import { aestheticEnricher } from "./enrichers/aesthetic";
import { autoTitleEnricher } from "./enrichers/auto-title";
import { captionEnricher } from "./enrichers/caption";
import { clipEnricher } from "./enrichers/clip";
import { ocrEnricher } from "./enrichers/ocr";
import { suggestedTagsEnricher } from "./enrichers/suggested-tags";
import { textEmbeddingEnricher } from "./enrichers/text-embedding";
import { transcriptEnricher } from "./enrichers/transcript";
import type { Enricher } from "./types";

/** Listed in dependency order, producers before consumers; the scheduler also enforces `dependsOn` per save, so a dependent only fires once its prerequisites have stamped that save. */
export const ENRICHERS: ReadonlyArray<Enricher> = [
  captionEnricher,
  ocrEnricher,
  transcriptEnricher,
  clipEnricher,
  aestheticEnricher,
  textEmbeddingEnricher,
  autoTitleEnricher,
  suggestedTagsEnricher,
];

export const ENRICHERS_BY_ID: ReadonlyMap<string, Enricher> = new Map(
  ENRICHERS.map((e) => [e.id, e]),
);
