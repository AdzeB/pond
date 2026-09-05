/** All ponds share one renderer origin, so bare localStorage keys are a single bucket across libraries; pond-scoped caches must namespace keys with the active pond id. */

function activePondId(): string {
  try {
    return window.pond.pondId();
  } catch {
    return "unbound";
  }
}

export function pondScopedKey(base: string): string {
  return `${base}:${activePondId()}`;
}
