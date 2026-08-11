import type { AskHistoryEntry } from "@pond/schema";
import { useSelector } from "@tanstack/react-store";
import { Store } from "@tanstack/store";
import { loadPrefs, patchPrefsSection } from "@/stores/prefs";

export type { AskHistoryEntry };

/**
 * Recent agent questions, powering the chat-history menu.
 * @remarks Persisted in the pond prefs slice, never shared localStorage: questions typed in one library must not surface in another.
 */

const HISTORY_CAP = 12;

const store = new Store<AskHistoryEntry[]>([]);

function normalize(
  raw: unknown,
  now = Date.now(),
): {
  entries: AskHistoryEntry[];
  migrated: boolean;
} {
  if (!Array.isArray(raw)) return { entries: [], migrated: false };
  const out: AskHistoryEntry[] = [];
  let migrated = false;
  for (const entry of raw) {
    if (typeof entry === "string" && entry.trim()) {
      /** Legacy string rows had no clock; stamp them recent so the menu can group and show ages. */
      out.push({
        text: entry.trim(),
        at: now - out.length * 60_000,
      });
      migrated = true;
      continue;
    }
    if (
      entry &&
      typeof entry === "object" &&
      typeof (entry as AskHistoryEntry).text === "string"
    ) {
      const text = (entry as AskHistoryEntry).text.trim();
      if (!text) continue;
      const at = Number((entry as AskHistoryEntry).at);
      if (Number.isFinite(at) && at > 0) {
        out.push({ text, at });
      } else {
        out.push({ text, at: now - out.length * 60_000 });
        migrated = true;
      }
    }
  }
  return { entries: out.slice(0, HISTORY_CAP), migrated };
}

let hydrated = false;
function hydrate(): void {
  if (hydrated) return;
  hydrated = true;
  void loadPrefs()
    .then((prefs) => {
      const { entries, migrated } = normalize(prefs.askHistory?.entries);
      store.setState((current) => {
        /** recordAsk may have won the race before prefs finished loading; keep the fresher list. */
        const currentFresh = current.some((entry) => entry.at > 0);
        const diskStale = entries.every((entry) => !entry.at);
        if (currentFresh && diskStale) return current;
        return entries;
      });
      if (migrated) {
        patchPrefsSection("askHistory", { entries: store.state });
      }
    })
    .catch(() => {
      /** Prefs unavailable: history starts empty this session. */
    });
}

hydrate();

/** Remigrate any in-memory rows that still lack a clock (from earlier string→{at:0} loads). */
{
  const { entries, migrated } = normalize(store.state);
  if (migrated) {
    store.setState(() => entries);
    patchPrefsSection("askHistory", { entries });
  }
}

/** Most-recent-first; de-dupes so re-asking promotes the existing entry. */
export function recordAsk(question: string): void {
  const text = question.trim();
  if (!text) return;
  const at = Date.now();
  store.setState((state) => {
    if (state[0]?.text === text) {
      return [{ text, at }, ...state.slice(1)];
    }
    return [{ text, at }, ...state.filter((q) => q.text !== text)].slice(
      0,
      HISTORY_CAP,
    );
  });
  patchPrefsSection("askHistory", { entries: store.state });
}

export function useAskHistory(): AskHistoryEntry[] {
  return useSelector(store, (s) => s);
}
