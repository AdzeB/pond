interface MemoCacheOptions {
  // Time-to-live in ms before a cached value is treated as stale and
  // recomputed on the next get(). Omit (or Infinity) to cache until an
  // explicit invalidate()/set().
  ttlMs?: number;
}

export interface MemoCache<T> {
  // Return the cached value when fresh, otherwise compute it. Concurrent
  // callers during a compute share the same in-flight promise, so the
  // work runs once.
  get(): Promise<T>;
  // The current cached value without triggering a compute. Returns null
  // when empty or stale. Handy for read-modify-write callers that want
  // to patch the cache only when it was already populated.
  peek(): T | null;
  // Overwrite the cached value and reset its freshness window.
  set(value: T): void;
  // Drop the cached value and abandon any in-flight compute.
  invalidate(): void;
}

// A tiny single-value async memo: TTL freshness plus in-flight dedupe.
// Replaces the hand-rolled `cached`/`inflight` pairs that were copied
// across several main-process modules. A rejected compute is never
// cached, so transient failures retry on the next get().
export function createMemoCache<T>(
  compute: () => Promise<T>,
  options: MemoCacheOptions = {},
): MemoCache<T> {
  const ttlMs = options.ttlMs ?? Number.POSITIVE_INFINITY;
  let entry: { value: T; computedAtMs: number } | null = null;
  let inflight: Promise<T> | null = null;

  function fresh(): boolean {
    if (!entry) return false;
    return Date.now() - entry.computedAtMs < ttlMs;
  }

  return {
    async get() {
      if (entry && fresh()) return entry.value;
      if (inflight) return inflight;
      inflight = (async () => {
        const value = await compute();
        entry = { value, computedAtMs: Date.now() };
        return value;
      })();
      try {
        return await inflight;
      } finally {
        inflight = null;
      }
    },
    peek() {
      return entry && fresh() ? entry.value : null;
    },
    set(value: T) {
      entry = { value, computedAtMs: Date.now() };
    },
    invalidate() {
      entry = null;
      inflight = null;
    },
  };
}
