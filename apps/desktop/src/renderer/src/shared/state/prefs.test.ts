import { DEFAULT_PREFS, type Prefs } from "@pond/schema";
import { expect, it, vi } from "vitest";
import {
  getPrefsSnapshot,
  loadPrefs,
  savePrefsSection,
  subscribePrefsSnapshot,
} from "./prefs";

it("receives another window's preferences and keeps the main process's committed values", async () => {
  const listeners = new Set<(prefs: Prefs) => void>();
  let saved = structuredClone(DEFAULT_PREFS);
  vi.stubGlobal("window", {
    pond: {
      onPrefsChanged(listener: (prefs: Prefs) => void) {
        listeners.add(listener);
        return () => listeners.delete(listener);
      },
      async query(name: string) {
        if (name === "settings.getPrefs") return saved;
        if (name === "settings.setPrefs") {
          saved = { ...saved, window: { ...saved.window, interfaceZoom: 125 } };
          for (const listener of listeners) listener(saved);
          return { ok: true, prefs: saved };
        }
        throw new Error(`Unexpected query: ${name}`);
      },
    },
  });
  let unsubscribe = (): void => {};
  try {
    const prefsChanged = vi.fn();
    unsubscribe = subscribePrefsSnapshot(prefsChanged);
    await loadPrefs();
    await loadPrefs();
    expect(listeners.size).toBe(1);
    saved = {
      ...saved,
      preferences: { ...saved.preferences, pointerCursors: true },
    };
    for (const listener of listeners) listener(saved);
    expect(getPrefsSnapshot()?.preferences.pointerCursors).toBe(true);
    await savePrefsSection("window", { interfaceZoom: 125 });
    expect(getPrefsSnapshot()?.window.interfaceZoom).toBe(125);
    expect(getPrefsSnapshot()?.preferences.pointerCursors).toBe(true);
    expect(prefsChanged).toHaveBeenCalled();
  } finally {
    unsubscribe();
    vi.unstubAllGlobals();
  }
});
