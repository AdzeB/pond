import { aestheticEnricher } from "./enrichers/aesthetic";
import { autoTitleEnricher } from "./enrichers/auto-title";
import { captionEnricher } from "./enrichers/caption";
import { mediaEmbeddingEnricher } from "./enrichers/media-embedding";
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
  mediaEmbeddingEnricher,
  aestheticEnricher,
  sensitiveContentEnricher,
  textEmbeddingEnricher,
  autoTitleEnricher,
  suggestedTagsEnricher,
];

export const ENRICHERS_BY_ID: ReadonlyMap<string, Enricher> = new Map(
  ENRICHERS.map((e) => [e.id, e]),
);
