import type { ImportableCookie } from "../refresh/harvest-window/session";

const stash = new Map<string, ImportableCookie[]>();

export function stashPageCookies(
  saveId: string,
  cookies: ImportableCookie[],
): void {
  if (cookies.length === 0) {
    stash.delete(saveId);
    return;
  }
  stash.set(saveId, cookies);
}

export function peekPageCookies(saveId: string): ImportableCookie[] | null {
  return stash.get(saveId) ?? null;
}

export function dropPageCookies(saveId: string): void {
  stash.delete(saveId);
}

/** In-memory session so a logged-in crawl does not write cookies into the shared scraper partition. */
export function pageCookiePartition(saveId: string): string {
  return `pond-page-${saveId}`;
}
