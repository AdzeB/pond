import { create, insert, remove, search, update } from "@orama/orama";
import type { Save } from "@/lib/types";

// A single in-memory Orama BM25 index over every save's searchable text. It is
// the one keyword-relevance source for both the grid search box
// (use-search-results) and the Ask agent's keyword ranker (ranking.ts), so the
// two never drift. Maintained incrementally from pool mutations
// (stores/pool.ts), which also covers enrichment optimistic updates since those
// funnel through upsertSave.
//
// Orama runs synchronously with the default tokenizer, so its insert/search
// helpers return values directly (their types are `T | Promise<T>` to allow
// async plugins we don't use); we cast accordingly to keep callers synchronous.

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

// Field weights: title/tags/author count most, enrichment text and the url least.
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

// Generous cap so a query returns every relevant save (consumers re-rank a
// candidate subset against these scores); Orama defaults to only 10 otherwise.
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

// Insert or replace a save in the index. Deleted saves are still indexed; the
// grid/Ask consumers apply their own live/trashed filter over the score map.
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

export type KeywordMatchMode = "all" | "any";

// Run a BM25 query and return a map of save id -> relevance score. `mode` "all"
// requires every query term to match (threshold 0, like the old grid scorer);
// "any" includes partial matches (threshold 1, like the old keyword ranker).
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
