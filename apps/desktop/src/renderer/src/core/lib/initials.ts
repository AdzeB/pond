// Up to two uppercase initials for an avatar / monogram fallback: the
// first letter of the first two words, or the first two letters of a
// single-word name.
export function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    return ((words[0]?.[0] ?? "") + (words[1]?.[0] ?? "")).toUpperCase();
  }
  return name.trim().slice(0, 2).toUpperCase();
}
