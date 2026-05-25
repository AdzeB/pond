import { useSyncExternalStore } from "react";

type Listener = () => void;

let buffer: readonly string[] = [];
const listeners = new Set<Listener>();

function notify(): void {
  for (const l of listeners) l();
}

export const tagClipboard = {
  get(): readonly string[] {
    return buffer;
  },
  set(next: readonly string[]): void {
    const cleaned = Array.from(
      new Set(next.map((t) => t.trim()).filter(Boolean)),
    );
    buffer = cleaned;
    notify();
  },
  clear(): void {
    if (buffer.length === 0) return;
    buffer = [];
    notify();
  },
  subscribe(cb: Listener): () => void {
    listeners.add(cb);
    return () => {
      listeners.delete(cb);
    };
  },
};

export function useTagClipboard(): readonly string[] {
  return useSyncExternalStore(
    tagClipboard.subscribe,
    tagClipboard.get,
    tagClipboard.get,
  );
}

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
