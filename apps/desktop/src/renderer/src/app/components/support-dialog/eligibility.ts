const PROMPTED_KEY = "pond:supportPrompted";
const FIRST_SEEN_KEY = "pond:firstSeenAt";
const MIN_SAVES = 500;
const MIN_AGE_MS = 14 * 24 * 60 * 60 * 1000;

export function shouldAskForSupport({
  saves,
  firstSeenAt,
  now,
}: {
  saves: number;
  firstSeenAt: number;
  now: number;
}): boolean {
  return saves >= MIN_SAVES && now - firstSeenAt >= MIN_AGE_MS;
}

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {}
}

export function hasAskedForSupport(): boolean {
  return read(PROMPTED_KEY) !== null;
}

export function markAskedForSupport(): void {
  write(PROMPTED_KEY, String(Date.now()));
}

export function firstSeenAt(now: number): number {
  const stored = Number(read(FIRST_SEEN_KEY));
  if (Number.isFinite(stored) && stored > 0) return stored;
  write(FIRST_SEEN_KEY, String(now));
  return now;
}
