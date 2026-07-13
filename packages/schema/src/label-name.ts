/** Casing is preserved for display; dedup happens through `labelKey`. */
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
