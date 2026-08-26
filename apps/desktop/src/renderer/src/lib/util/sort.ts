export function byName<T extends { name: string }>(a: T, b: T): number {
  return a.name.localeCompare(b.name);
}

export function bySortOrderThenName<
  T extends { sortOrder: number; name: string },
>(a: T, b: T): number {
  return a.sortOrder - b.sortOrder || a.name.localeCompare(b.name);
}
