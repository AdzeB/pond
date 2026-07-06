import { useSelector } from "@tanstack/react-store";
import { Store } from "@tanstack/store";

// Recent natural-language questions asked of the agent. Kept separate from the
// structured search history; powers the AskBar's undo/redo (step back/forward
// through prior questions) and a recent-questions menu.

const STORAGE_KEY = "pond.ask.history";
const HISTORY_CAP = 12;

function hydrate(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((x): x is string => typeof x === "string")
      .slice(0, HISTORY_CAP);
  } catch {
    return [];
  }
}

function persist(next: string[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* localStorage may be denied (private mode, quota); ignore */
  }
}

const store = new Store<string[]>(hydrate());

// Most-recent-first; de-dupes so re-asking promotes the existing entry.
export function recordAsk(question: string): void {
  const text = question.trim();
  if (!text) return;
  store.setState((state) => {
    if (state[0] === text) return state;
    return [text, ...state.filter((q) => q !== text)].slice(0, HISTORY_CAP);
  });
  persist(store.state);
}
export function useAskHistory(): string[] {
  return useSelector(store, (s) => s);
}
