import { useSelector } from "@tanstack/react-store";
import { Store } from "@tanstack/store";
import { loadPrefs, patchPrefsSection } from "@/stores/prefs";

/**
 * Recent agent questions, powering the AskBar's undo/redo and recent-questions menu.
 * @remarks Persisted in the pond prefs slice, never shared localStorage: questions typed in one library must not surface in another.
 */

const HISTORY_CAP = 12;

const store = new Store<string[]>([]);

let hydrated = false;
function hydrate(): void {
  if (hydrated) return;
  hydrated = true;
  void loadPrefs()
    .then((prefs) => {
      const entries = prefs.askHistory?.entries;
      if (Array.isArray(entries)) {
        store.setState(() =>
          entries
            .filter((x): x is string => typeof x === "string")
            .slice(0, HISTORY_CAP),
        );
      }
    })
    .catch(() => {
      /** Prefs unavailable: history starts empty this session. */
    });
}

hydrate();

/** Most-recent-first; de-dupes so re-asking promotes the existing entry. */
export function recordAsk(question: string): void {
  const text = question.trim();
  if (!text) return;
  store.setState((state) => {
    if (state[0] === text) return state;
    return [text, ...state.filter((q) => q !== text)].slice(0, HISTORY_CAP);
  });
  patchPrefsSection("askHistory", { entries: store.state });
}

export function useAskHistory(): string[] {
  return useSelector(store, (s) => s);
}
