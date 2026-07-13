import { create, insert, remove, search, update } from "@orama/orama";
import type { Save } from "@/lib/types";

/**
 * The one Orama BM25 index for both the grid search box and the Ask keyword ranker, so the two never drift; maintained incrementally from pool mutations.
 * @remarks Orama runs synchronously with the default tokenizer — its helpers are typed `T | Promise<T>` only for async plugins we don't use, so we cast to keep callers synchronous.
 */

const schema = {
  id: "string",
  title: "string",
  tags: "string",
  author: "string",
  description: "string",
  notes: "string",
  caption: "string",
  ocrText: "string",
  transcript: "string",
  url: "string",
} as const;

/** Field weights: title/tags/author count most, enrichment text and the url least. */
const BOOST = {
  title: 4,
  tags: 3,
  author: 3,
  notes: 2,
  caption: 2,
  description: 1,
  ocrText: 1,
  transcript: 1,
  url: 1,
} as const;

/** Generous cap so a query returns every relevant save; Orama defaults to only 10 otherwise. */
const MAX_HITS = 10_000;

function makeDb() {
  return create({ schema });
}

type Db = ReturnType<typeof makeDb>;

let db: Db = makeDb();
const indexed = new Set<string>();

function docOf(save: Save): Record<string, string> {
  return {
    id: save.id,
    title: save.title ?? "",
    tags: (save.tags ?? []).join(" "),
    author: save.author ?? "",
    description: save.description ?? "",
    notes: save.notes ?? "",
    caption: save.caption ?? "",
    ocrText: save.ocrText ?? "",
    transcript: save.transcript ?? "",
    url: save.url ?? "",
  };
}

/** Deleted saves stay indexed; consumers apply their own live/trashed filter over the score map. */
export function indexSave(save: Save): void {
  const doc = docOf(save);
  if (indexed.has(save.id)) {
    update(db, save.id, doc);
  } else {
    insert(db, doc);
    indexed.add(save.id);
  }
}

export function indexSaves(list: ReadonlyArray<Save>): void {
  for (const save of list) indexSave(save);
}

export function removeSaveFromIndex(id: string): void {
  if (!indexed.has(id)) return;
  remove(db, id);
  indexed.delete(id);
}

export function clearTextIndex(): void {
  db = makeDb();
  indexed.clear();
}

type KeywordMatchMode = "all" | "any";

/** Mode "all" requires every query term to match (threshold 0); "any" includes partial matches (threshold 1). */
export function searchScores(
  term: string,
  mode: KeywordMatchMode = "any",
): Map<string, number> {
  const out = new Map<string, number>();
  if (!term.trim()) return out;
  const res = search(db, {
    term,
    properties: "*",
    boost: BOOST,
    threshold: mode === "all" ? 0 : 1,
    limit: MAX_HITS,
  }) as unknown as { hits: Array<{ id: string; score: number }> };
  for (const hit of res.hits) out.set(String(hit.id), hit.score);
  return out;
}
