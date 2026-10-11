export function librarySaveLink(libraryId: string, saveId: string): string {
  const url = new URL(`pond://item/${encodeURIComponent(saveId)}`);
  url.searchParams.set("library", libraryId);
  return url.toString();
}

export function libraryFolderLink(libraryId: string, folderId: string): string {
  const url = new URL(`pond://folder/${encodeURIComponent(folderId)}`);
  url.searchParams.set("library", libraryId);
  return url.toString();
}

export function librarySavedViewLink(
  libraryId: string,
  viewId: string,
): string {
  const url = new URL(`pond://view/${encodeURIComponent(viewId)}`);
  url.searchParams.set("library", libraryId);
  return url.toString();
}

export function linkMatchesLibrary(url: URL, libraryId: string): boolean {
  const expected = url.searchParams.get("library");
  return !expected || expected === libraryId;
}
