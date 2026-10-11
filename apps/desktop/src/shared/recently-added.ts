const RECENTLY_ADDED_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

export function recentlyAddedSince(now = Date.now()): number {
  return now - RECENTLY_ADDED_WINDOW_MS;
}
