import { useSelector } from "@tanstack/react-store";
import { Store } from "@tanstack/store";
import { useEffect } from "react";

const STORAGE_KEY = "pond.recents.saves";
const RECENTS_CAP = 20;

interface RecentEntry {
  saveId: string;
  visitedAt: number;
}

function hydrate(): RecentEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    const out: RecentEntry[] = [];
    for (const item of parsed) {
      if (
        item &&
        typeof item === "object" &&
        typeof (item as RecentEntry).saveId === "string" &&
        typeof (item as RecentEntry).visitedAt === "number"
      ) {
        out.push({
          saveId: (item as RecentEntry).saveId,
          visitedAt: (item as RecentEntry).visitedAt,
        });
      }
    }
    return out.slice(0, RECENTS_CAP);
  } catch {
    return [];
  }
}

function persist(next: RecentEntry[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* localStorage may be denied (private mode, quota); ignore */
  }
}

const store = new Store<RecentEntry[]>(hydrate());

function recordVisit(saveId: string): void {
  store.setState((state) => {
    const top = state[0];
    if (top?.saveId === saveId) {
      return [{ saveId, visitedAt: Date.now() }, ...state.slice(1)];
    }
    return [
      { saveId, visitedAt: Date.now() },
      ...state.filter((e) => e.saveId !== saveId),
    ].slice(0, RECENTS_CAP);
  });
  persist(store.state);
}

export function useRecents(): RecentEntry[] {
  return useSelector(store, (s) => s);
}

export function useTrackVisit(saveId: string | null | undefined): void {
  useEffect(() => {
    if (!saveId) return;
    recordVisit(saveId);
  }, [saveId]);
}
