export function addPdfRenderWindow(
  current: ReadonlySet<number>,
  pageNumber: number,
  pageCount: number,
  overscan = 1,
): Set<number> {
  const next = new Set(current);
  const start = Math.max(1, pageNumber - overscan);
  const end = Math.min(pageCount, pageNumber + overscan);
  for (let page = start; page <= end; page += 1) next.add(page);
  return next;
}
