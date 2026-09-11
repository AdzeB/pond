export function moveOrderedItem(
  order: readonly string[],
  id: string,
  destination: number,
): string[] {
  const from = order.indexOf(id);
  if (from < 0) return [...order];
  const next = order.filter((value) => value !== id);
  next.splice(Math.max(0, Math.min(next.length, destination)), 0, id);
  return next;
}
