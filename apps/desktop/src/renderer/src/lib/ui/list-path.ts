import { parseMode } from "@/lib/save/list";
import { listBaseFromPath } from "@/lib/search/schemas";

/** Last library-list surface (`/`, `/trash`, …) so save overlays can keep mode and return correctly. */
let lastListPath = "/";
let lastListSearch = "";

function isSavePath(pathname: string): boolean {
  return /^\/save\/[^/]+\/?$/.test(pathname);
}

function isLibraryListPath(pathname: string): boolean {
  if (isSavePath(pathname)) return false;
  if (pathname.startsWith("/sources")) {
    return false;
  }
  return parseMode(listBaseFromPath(pathname)) !== null;
}

export function rememberListPath(pathname: string, search = ""): void {
  if (!isLibraryListPath(pathname)) return;
  lastListPath = listBaseFromPath(pathname);
  lastListSearch = search;
}

export function getLastListPath(): string {
  return lastListPath;
}

export function getLastListSearch(): string {
  return lastListSearch;
}

/** Pathname to use for list mode while a save overlay is open. */
export function listPathForLocation(pathname: string): string {
  if (isSavePath(pathname)) return lastListPath;
  if (isLibraryListPath(pathname)) return listBaseFromPath(pathname);
  return lastListPath;
}
