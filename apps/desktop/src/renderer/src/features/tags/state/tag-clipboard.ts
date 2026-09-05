import { Store } from "@tanstack/store";

interface TagClipboardState {
  readonly tags: readonly string[];
}

const store = new Store<TagClipboardState>({ tags: [] });

export const tagClipboard = {
  get(): readonly string[] {
    return store.state.tags;
  },
  set(next: readonly string[]): void {
    const cleaned = Array.from(
      new Set(next.map((t) => t.trim()).filter(Boolean)),
    );
    store.setState(() => ({ tags: cleaned }));
  },
  clear(): void {
    store.setState((s) => (s.tags.length === 0 ? s : { tags: [] }));
  },
};

export function mergeUniqueTags(
  current: readonly string[],
  incoming: readonly string[],
): string[] {
  const seen = new Set(current.map((t) => t.toLowerCase()));
  const next = [...current];
  for (const raw of incoming) {
    const t = raw.trim();
    if (!t) continue;
    const key = t.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    next.push(t);
  }
  return next;
}
