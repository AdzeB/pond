import { aestheticEnricher } from "./enrichers/aesthetic";
import { autoTitleEnricher } from "./enrichers/auto-title";
import { captionEnricher } from "./enrichers/caption";
import { clipEnricher } from "./enrichers/clip";
import { ocrEnricher } from "./enrichers/ocr";
import { sensitiveContentEnricher } from "./enrichers/sensitive-content";
import { suggestedTagsEnricher } from "./enrichers/suggested-tags";
import { textEmbeddingEnricher } from "./enrichers/text-embedding";
import { transcriptEnricher } from "./enrichers/transcript";
import type { Enricher } from "./types";

export const ENRICHERS: ReadonlyArray<Enricher> = [
  captionEnricher,
  ocrEnricher,
  transcriptEnricher,
  clipEnricher,
  aestheticEnricher,
  sensitiveContentEnricher,
  textEmbeddingEnricher,
  autoTitleEnricher,
  suggestedTagsEnricher,
];

export const ENRICHERS_BY_ID: ReadonlyMap<string, Enricher> = new Map(
  ENRICHERS.map((e) => [e.id, e]),
);
