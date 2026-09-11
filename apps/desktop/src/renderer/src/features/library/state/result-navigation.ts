import type { LibraryQueryRequest } from "@shared/library-query";

interface ResultSource {
  request?: LibraryQueryRequest;
  neighbor?: (id: string, delta: number) => Promise<string | null>;
  key?: string;
  loadedIds?: () => readonly string[];
  ids: readonly string[];
  allIds?: () => Promise<string[] | null>;
  loadMore?: () => Promise<void>;
}

let source: ResultSource = { ids: [] };
let reveal: ((id: string) => void) | null = null;
let pendingReveal: string | null = null;

export const resultNavigation = {
  request(): LibraryQueryRequest | undefined {
    return source.request;
  },
  setSource(next: ResultSource): void {
    if (source.key !== next.key) pendingReveal = null;
    source = next;
    if (pendingReveal && source.ids.includes(pendingReveal))
      reveal?.(pendingReveal);
  },
  async ids(): Promise<readonly string[]> {
    return (await source.allIds?.()) ?? source.ids;
  },
  async next(id: string, delta: number): Promise<string | null> {
    if (source.neighbor) return source.neighbor(id, delta);
    const loadedIndex = source.ids.indexOf(id);
    const loaded =
      loadedIndex >= 0 ? source.ids[loadedIndex + delta] : undefined;
    if (loaded) return loaded;
    const ids = await this.ids();
    const index = ids.indexOf(id);
    return index < 0 ? null : (ids[index + delta] ?? null);
  },
  registerReveal(callback: (id: string) => void): () => void {
    reveal = callback;
    if (pendingReveal) callback(pendingReveal);
    return () => {
      if (reveal === callback) reveal = null;
    };
  },
  async reveal(id: string): Promise<void> {
    pendingReveal = id;
    const key = source.key;
    while (
      !(source.loadedIds?.() ?? source.ids).includes(id) &&
      source.loadMore
    ) {
      const previous = (source.loadedIds?.() ?? source.ids).length;
      await source.loadMore();
      if (source.key !== key || pendingReveal !== id) return;
      if ((source.loadedIds?.() ?? source.ids).length <= previous) break;
    }
    if (source.key === key) reveal?.(id);
  },
  didReveal(id: string): void {
    if (pendingReveal === id) pendingReveal = null;
  },
};
