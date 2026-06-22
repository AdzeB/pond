import type { NlFacets } from "./nl-query";
import type { Save } from "./types";

// Distinct, lowercased facet values present in the library, ordered by frequency
// (most common first). Shared by the NL compiler (grounding) and the embedding
// facet resolver, so synonym/value matching can only ever resolve to real data.

function bump(map: Map<string, number>, key: string): void {
  map.set(key, (map.get(key) ?? 0) + 1);
}

function ranked(map: Map<string, number>): string[] {
  return Array.from(map, ([value, count]) => ({ value, count }))
    .sort((a, b) => b.count - a.count || a.value.localeCompare(b.value))
    .map((e) => e.value);
}

export function computeLiveFacets(saves: ReadonlyArray<Save>): NlFacets {
  const sources = new Map<string, number>();
  const tags = new Map<string, number>();
  const types = new Map<string, number>();
  const creators = new Map<string, number>();
  for (const save of saves) {
    if (save.deletedAt) continue;
    if (save.source) bump(sources, save.source.toLowerCase());
    for (const tag of save.tags ?? []) bump(tags, tag.toLowerCase());
    const type = (save.mediaType ?? "").toLowerCase();
    if (type) bump(types, type);
    const author = save.author?.trim();
    if (author) bump(creators, author.toLowerCase());
  }
  return {
    sources: ranked(sources),
    tags: ranked(tags),
    types: ranked(types),
    creators: ranked(creators),
  };
}
