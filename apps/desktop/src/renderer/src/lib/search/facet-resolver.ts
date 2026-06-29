import type { Predicate } from "@pond/schema/filters/types";
import { embedText, embedTexts } from "@/lib/enrichment/embeddings";
import type { NlFacets } from "@/lib/search/nl-query";
import { dot } from "@/lib/util/vector";

// Stage B of the compiler: resolve words Stage A couldn't match to the nearest
// real facet value using embedding similarity (e.g. "tweets" -> source twitter,
// "clips" -> type video). It only ever returns values that exist in the library,
// so it cannot hallucinate a facet. The vocabulary is embedded lazily and cached
// per facet signature; it rebuilds when the library's distinct values change.

type FacetField = "source" | "type" | "tags" | "creator";

interface VocabEntry {
  field: FacetField;
  value: string;
  vec: Float32Array;
}

// A word must clear this cosine similarity to a facet value to be accepted.
const MATCH_THRESHOLD = 0.55;

let vocabSignature = "";
let vocabPromise: Promise<VocabEntry[]> | null = null;

function signatureOf(facets: NlFacets): string {
  return [
    facets.sources.join(","),
    facets.types.join(","),
    facets.tags.slice(0, 200).join(","),
    facets.creators.slice(0, 200).join(","),
  ].join("|");
}

async function buildVocab(facets: NlFacets): Promise<VocabEntry[]> {
  const items: { field: FacetField; value: string }[] = [];
  for (const v of facets.sources) items.push({ field: "source", value: v });
  for (const v of facets.types) items.push({ field: "type", value: v });
  // Cap open-vocabulary fields so vocab embedding stays bounded on huge libraries.
  for (const v of facets.tags.slice(0, 200))
    items.push({ field: "tags", value: v });
  for (const v of facets.creators.slice(0, 200))
    items.push({ field: "creator", value: v });

  if (items.length === 0) return [];
  const vecs = await embedTexts(items.map((i) => i.value));
  return items.map((item, idx) => ({
    field: item.field,
    value: item.value,
    vec: vecs[idx] as Float32Array,
  }));
}

function getVocab(facets: NlFacets): Promise<VocabEntry[]> {
  const sig = signatureOf(facets);
  if (sig !== vocabSignature || !vocabPromise) {
    vocabSignature = sig;
    vocabPromise = buildVocab(facets).catch((err) => {
      console.warn("[facet-resolver] vocab build failed", err);
      vocabPromise = null;
      return [];
    });
  }
  return vocabPromise;
}

function toPredicate(field: FacetField, value: string): Predicate {
  switch (field) {
    case "tags":
      return { field: "tags", operator: "some", value: [value] };
    case "creator":
      return { field: "creator", operator: "eq", value };
    case "source":
      return { field: "source", operator: "eq", value };
    case "type":
      return { field: "type", operator: "eq", value };
  }
}

// Resolve each residual word to its nearest facet value (if close enough),
// returning the matched predicates plus the words that stayed unresolved.
export async function resolveFacets(
  residual: string,
  facets: NlFacets,
): Promise<{ predicates: Predicate[]; residual: string }> {
  const words = residual.split(/\s+/).filter(Boolean);
  if (words.length === 0) return { predicates: [], residual: "" };

  const vocab = await getVocab(facets);
  if (vocab.length === 0) return { predicates: [], residual };

  const wordVecs = await embedTexts(words);
  const predicates: Predicate[] = [];
  const leftover: string[] = [];

  words.forEach((word, idx) => {
    const wv = wordVecs[idx];
    if (!wv) {
      leftover.push(word);
      return;
    }
    let best: VocabEntry | null = null;
    let bestScore = MATCH_THRESHOLD;
    for (const entry of vocab) {
      const score = dot(wv, entry.vec);
      if (score > bestScore) {
        bestScore = score;
        best = entry;
      }
    }
    if (best) predicates.push(toPredicate(best.field, best.value));
    else leftover.push(word);
  });

  return { predicates, residual: leftover.join(" ") };
}

// Embed a free-text query once for semantic ranking of results.
export async function embedQuery(text: string): Promise<Float32Array | null> {
  const trimmed = text.trim();
  if (!trimmed) return null;
  try {
    return await embedText(trimmed);
  } catch (err) {
    console.warn("[facet-resolver] query embed failed", err);
    return null;
  }
}
