export function libraryItemLink(libraryId: string, saveId: string): string {
  const url = new URL(`pond://item/${encodeURIComponent(saveId)}`);
  url.searchParams.set("library", libraryId);
  return url.toString();
}
export function linkMatchesLibrary(url: URL, libraryId: string): boolean {
  const expected = url.searchParams.get("library");
  return !expected || expected === libraryId;
}
