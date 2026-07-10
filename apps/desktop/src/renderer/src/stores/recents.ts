import type { RecentSaveVisit } from "@pond/schema/db";
import { useSelector } from "@tanstack/react-store";
import { Store } from "@tanstack/store";
import { useEffect } from "react";
import { loadPrefs, patchPrefsSection } from "@/stores/prefs";

// Recently visited saves; feeds the native History menu. Persisted in the pond
// prefs slice (bundle settings.json) because save ids are pond-specific —
// shared localStorage would leak one library's recents into another.

const RECENTS_CAP = 20;

const store = new Store<RecentSaveVisit[]>([]);

let hydrated = false;
function hydrate(): void {
  if (hydrated) return;
  hydrated = true;
  void loadPrefs()
    .then((prefs) => {
      const entries = prefs.saveRecents?.entries;
      if (Array.isArray(entries)) {
        store.setState(() =>
          entries
            .filter(
              (e): e is RecentSaveVisit =>
                e != null &&
                typeof e.saveId === "string" &&
                typeof e.visitedAt === "number",
            )
            .slice(0, RECENTS_CAP),
        );
      }
    })
    .catch(() => {
      /* prefs unavailable: recents start empty this session */
    });
}

hydrate();

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
  patchPrefsSection("saveRecents", { entries: store.state });
}

export function useRecents(): RecentSaveVisit[] {
  return useSelector(store, (s) => s);
}

export function useTrackVisit(saveId: string | null | undefined): void {
  useEffect(() => {
    if (!saveId) return;
    recordVisit(saveId);
  }, [saveId]);
}
