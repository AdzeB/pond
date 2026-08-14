import type { Source } from "@pond/schema/db";

const TIMEOUT_MS = 30 * 60 * 1000;

let pending: { source: Source; setAt: number } | null = null;
let onCleared: (() => void) | null = null;

/** Lets the connect browser tear down when pending clears (import success or cancel). */
export function onPendingSessionCleared(fn: (() => void) | null): void {
  onCleared = fn;
}

export function setPendingSessionSource(source: Source): void {
  pending = { source, setAt: Date.now() };
}

export function getPendingSessionSource(): Source | null {
  if (!pending) return null;
  if (Date.now() - pending.setAt > TIMEOUT_MS) {
    pending = null;
    return null;
  }
  return pending.source;
}

export function clearPendingSessionSource(source?: Source): void {
  if (!pending) return;
  if (source === undefined || pending.source === source) {
    pending = null;
    onCleared?.();
  }
}
