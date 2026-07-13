/** Locale comparator by `name`, stable for equal names. */
export function byName<T extends { name: string }>(a: T, b: T): number {
  return a.name.localeCompare(b.name);
}

/** Orders by explicit `sortOrder`, breaking ties by locale name. */
export function bySortOrderThenName<
  T extends { sortOrder: number; name: string },
>(a: T, b: T): number {
  return a.sortOrder - b.sortOrder || a.name.localeCompare(b.name);
}
