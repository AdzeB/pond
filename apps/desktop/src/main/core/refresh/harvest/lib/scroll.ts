/// <reference lib="dom" />

export function inPageScrollCollect() {
  return async function scrollCollect<
    T extends { sourceId: string; url: string },
  >(opts: {
    collectFn: () => T[];
    knownIds: string[];
    hydrateSelector: string;
    hydrateTimeoutMs?: number;
    scrollTimeoutMs?: number;
    stableThreshold?: number;
    scrollDelayMs?: number;
    scrollBehavior?: "scroll" | "click-next";
    nextSelector?: string;
    nextFinder?: () => HTMLElement | null;
    nextDelayMs?: number;
    // Stop once this many consecutive batches add only already-known items.
    // These lists are newest-first, so an all-known batch means we've scrolled
    // into the already-synced backlog. 0 disables early-stop (full walk).
    stopAfterKnownBatches?: number;
  }) {
    const {
      collectFn,
      knownIds,
      hydrateSelector,
      hydrateTimeoutMs = 12_000,
      scrollTimeoutMs = 60_000,
      stableThreshold = 4,
      scrollDelayMs = 700,
      scrollBehavior = "scroll",
      nextSelector,
      nextFinder,
      nextDelayMs = 1500,
      stopAfterKnownBatches = 3,
    } = opts;

    const known = new Set(knownIds.map(String));
    const collected = new Map<string, T>();
    // Early-stop only applies on incremental syncs (we have a baseline to hit).
    const earlyStopEnabled = stopAfterKnownBatches > 0 && known.size > 0;
    let knownBatchStreak = 0;

    // Returns true once we've added enough consecutive all-known batches.
    function ingest(rows: T[]): boolean {
      let addedAny = false;
      let addedFresh = false;
      for (const r of rows) {
        if (collected.has(r.sourceId)) continue;
        collected.set(r.sourceId, r);
        addedAny = true;
        if (!known.has(r.sourceId)) addedFresh = true;
      }
      if (!earlyStopEnabled) return false;
      if (addedFresh) {
        knownBatchStreak = 0;
      } else if (addedAny) {
        // New rows appeared, but every one was already in the library.
        knownBatchStreak += 1;
      }
      return knownBatchStreak >= stopAfterKnownBatches;
    }

    function result(reachedEnd: boolean) {
      return {
        ok: true as const,
        entries: Array.from(collected.values()),
        reachedEnd,
      };
    }

    const hydrateDeadline = Date.now() + hydrateTimeoutMs;
    while (Date.now() < hydrateDeadline) {
      if (document.querySelector(hydrateSelector)) break;
      await new Promise((r) => setTimeout(r, 250));
    }

    ingest(collectFn());

    if (scrollBehavior === "click-next") {
      const navDeadline = Date.now() + scrollTimeoutMs;
      while (Date.now() < navDeadline) {
        const next: HTMLElement | null = nextFinder
          ? nextFinder()
          : nextSelector
            ? document.querySelector<HTMLElement>(nextSelector)
            : document.querySelector<HTMLAnchorElement>(
                "a[rel*='next'], span.next-button > a",
              );
        if (!next) break;
        next.click();
        await new Promise((r) => setTimeout(r, nextDelayMs));
        if (ingest(collectFn())) return result(true);
      }
      return result(true);
    }

    const scrollDeadline = Date.now() + scrollTimeoutMs;
    let lastHeight = document.documentElement.scrollHeight;
    let stable = 0;
    while (Date.now() < scrollDeadline) {
      window.scrollBy({
        top: window.innerHeight * 0.9,
        behavior: "instant" as ScrollBehavior,
      });
      await new Promise((r) => setTimeout(r, scrollDelayMs));
      if (ingest(collectFn())) return result(true);
      const sh = document.documentElement.scrollHeight;
      if (sh === lastHeight) {
        stable += 1;
        if (stable >= stableThreshold) return result(true);
      } else {
        stable = 0;
        lastHeight = sh;
      }
    }
    return result(false);
  };
}
