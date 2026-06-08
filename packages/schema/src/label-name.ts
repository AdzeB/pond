// Returns the user-facing label: trims, strips a leading `#`, collapses
// whitespace runs to a single space, and drops anything outside the
// allowed character set (which includes spaces). Casing is preserved so
// "Funny" stays "Funny" in the UI and on the save. Match / dedup against
// the canonical form via `labelKey` below; every comparison in the
// system goes through it.
export function normalizeLabelName(raw: string): string {
  return raw
    .trim()
    .replace(/^#+/, "")
    .replace(/\s+/g, " ")
    .replace(/[^a-z0-9 /:.-]/gi, "")
    .trim();
}

export function labelKey(raw: string): string {
  return normalizeLabelName(raw).toLowerCase();
}
