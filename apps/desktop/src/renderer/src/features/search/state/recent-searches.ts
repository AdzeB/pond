import { useSelector } from "@tanstack/react-store";
import { Store } from "@tanstack/store";
import { z } from "zod";

const STORAGE_KEY = "pond:recent-searches";
const RecentSearchesSchema = z.array(z.string().trim().min(1)).max(5);

function read(): string[] {
  if (!globalThis.window) return [];
  try {
    const decoded = JSON.parse(
      window.localStorage.getItem(STORAGE_KEY) ?? "[]",
    );
    return RecentSearchesSchema.catch([]).parse(decoded);
  } catch {
    return [];
  }
}

const store = new Store<readonly string[]>(read());

function write(searches: readonly string[]): void {
  store.setState(() => searches);
  if (!globalThis.window) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(searches));
  } catch {}
}

export function recordRecentSearch(value: string): void {
  const query = value.trim();
  if (!query) return;
  write(
    [
      query,
      ...store.state.filter(
        (item) => item.toLowerCase() !== query.toLowerCase(),
      ),
    ].slice(0, 5),
  );
}

export function removeRecentSearch(value: string): void {
  write(store.state.filter((item) => item !== value));
}

export function clearRecentSearches(): void {
  write([]);
}

export function recentSearchesSnapshot(): readonly string[] {
  return store.state;
}

export function useRecentSearches(): readonly string[] {
  return useSelector(store, (searches) => searches);
}
