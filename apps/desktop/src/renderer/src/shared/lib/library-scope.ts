/** All Libraries share one renderer origin, so Library-scoped localStorage keys must include the active Library id. */

function activeLibraryId(): string {
  try {
    return window.pond.libraryId();
  } catch {
    return "unbound";
  }
}

export function libraryScopedKey(base: string): string {
  return `${base}:${activeLibraryId()}`;
}
