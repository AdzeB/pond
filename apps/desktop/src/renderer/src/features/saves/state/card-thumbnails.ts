/** Maps an original image URL to the thumbnail a card last decoded, so the viewer can paint it first. */
const LIMIT = 512;
const thumbnails = new Map<string, string>();

export function rememberCardThumbnail(original: string, shown: string): void {
  thumbnails.delete(original);
  thumbnails.set(original, shown);
  if (thumbnails.size <= LIMIT) return;
  const oldest = thumbnails.keys().next();
  if (!oldest.done) thumbnails.delete(oldest.value);
}

export function cardThumbnailFor(original: string): string | null {
  return thumbnails.get(original) ?? null;
}
