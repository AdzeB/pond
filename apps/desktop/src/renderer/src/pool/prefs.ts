import type { Prefs } from "@pond/schema/db";
import { useStore } from "@tanstack/react-store";
import { Store } from "@tanstack/store";
import { useEffect } from "react";

interface PrefsState {
  readonly value: Prefs | null;
}

export const prefsStore = new Store<PrefsState>({ value: null });

let inflight: Promise<Prefs> | null = null;

async function load(): Promise<Prefs> {
  if (prefsStore.state.value) return prefsStore.state.value;
  if (inflight) return inflight;
  inflight = (async () => {
    const next = (await window.pond.query("settings.getPrefs", {})) as Prefs;
    prefsStore.setState(() => ({ value: next }));
    inflight = null;
    return next;
  })();
  return inflight;
}

export function usePrefs<K extends keyof Prefs>(
  section: K,
): [Prefs[K], (patch: Partial<Prefs[K]>) => void, boolean] {
  useEffect(() => {
    void load();
  }, []);

  const value = useStore(prefsStore, (s) => s.value?.[section] ?? null);

  const patch = (delta: Partial<Prefs[K]>) => {
    const cache = prefsStore.state.value;
    if (!cache) return;
    const merged: Prefs = {
      ...cache,
      [section]: { ...cache[section], ...delta },
    };
    prefsStore.setState(() => ({ value: merged }));
    void window.pond
      .query("settings.setPrefs", { [section]: delta } as Partial<Prefs>)
      .catch(() => {
        // Roll back on failure so the UI stops lying.
        prefsStore.setState(() => ({ value: cache }));
      });
  };

  return [value ?? ({} as Prefs[K]), patch, value !== null];
}

export function getPrefsSnapshot(): Prefs | null {
  return prefsStore.state.value;
}

export async function reloadPrefs(): Promise<Prefs> {
  prefsStore.setState(() => ({ value: null }));
  inflight = null;
  return load();
}
