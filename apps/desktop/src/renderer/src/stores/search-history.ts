import type { Query } from "@pond/schema/filters/types";
import { useSelector } from "@tanstack/react-store";
import { Store } from "@tanstack/store";
import { serializeQuery } from "@/lib/search-syntax";

const STORAGE_KEY = "pond.search.history";
const HISTORY_CAP = 8;

export interface SearchHistoryEntry {
  id: string;
  // The full structured-search string, so it round-trips via parseSearchInput.
  text: string;
  at: number;
}

function hydrate(): SearchHistoryEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    const out: SearchHistoryEntry[] = [];
    for (const item of parsed) {
      if (
        item &&
        typeof item === "object" &&
        typeof (item as SearchHistoryEntry).id === "string" &&
        typeof (item as SearchHistoryEntry).text === "string" &&
        typeof (item as SearchHistoryEntry).at === "number"
      ) {
        out.push({
          id: (item as SearchHistoryEntry).id,
          text: (item as SearchHistoryEntry).text,
          at: (item as SearchHistoryEntry).at,
        });
      }
    }
    return out.slice(0, HISTORY_CAP);
  } catch {
    return [];
  }
}

function persist(next: SearchHistoryEntry[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* localStorage may be denied (private mode, quota); ignore */
  }
}

const store = new Store<SearchHistoryEntry[]>(hydrate());

function makeId(): string {
  return `search-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

// Combine active predicates with residual free text into the same string the
// search bar produces, so a recorded entry replays exactly.
export function searchString(query: Query, q: string): string {
  return [serializeQuery(query), q]
    .filter((s) => s.length > 0)
    .join(" ")
    .trim();
}

export function recordSearch(query: Query, q: string): void {
  const text = searchString(query, q);
  if (!text) return;
  store.setState((state) => {
    if (state[0]?.text === text) return state;
    return [
      { id: makeId(), text, at: Date.now() },
      ...state.filter((e) => e.text !== text),
    ].slice(0, HISTORY_CAP);
  });
  persist(store.state);
}

export function removeSearch(id: string): void {
  store.setState((state) => state.filter((e) => e.id !== id));
  persist(store.state);
}

export function clearHistory(): void {
  store.setState(() => []);
  persist(store.state);
}

export function useSearchHistory(): SearchHistoryEntry[] {
  return useSelector(store, (s) => s);
}
