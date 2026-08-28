export function toggleInSet<T>(
  set: ReadonlySet<T>,
  id: T,
  on: boolean,
): ReadonlySet<T> {
  if (on) {
    if (set.has(id)) return set;
    const next = new Set(set);
    next.add(id);
    return next;
  }
  if (!set.has(id)) return set;
  const next = new Set(set);
  next.delete(id);
  return next;
}
