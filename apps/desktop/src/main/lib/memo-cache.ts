interface MemoCacheOptions {
  // Staleness TTL in ms; omit to cache until an explicit invalidate()/set().
  ttlMs?: number;
}

interface MemoCache<T> {
  // Return the cached value or compute it; concurrent callers share one compute.
  get(): Promise<T>;
  // Current cached value without computing; null when empty or stale.
  peek(): T | null;
  // Overwrite the cached value and reset its freshness window.
  set(value: T): void;
  // Drop the cached value and abandon any in-flight compute.
  invalidate(): void;
}

// Single-value async memo: TTL freshness plus in-flight dedupe; rejections aren't cached.
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
