// All ponds share one renderer origin, so bare localStorage keys are a single
// bucket across libraries. Pond-scoped caches must namespace their keys with
// the active pond id (resolved synchronously by the preload).

export function activePondId(): string {
  try {
    return window.pond.pondId();
  } catch {
    return "unbound";
  }
}

export function pondScopedKey(base: string): string {
  return `${base}:${activePondId()}`;
}
