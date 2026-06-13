// User-facing label: trim, strip leading `#`, collapse whitespace, drop
// disallowed chars. Casing preserved; dedup via `labelKey` below.
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
