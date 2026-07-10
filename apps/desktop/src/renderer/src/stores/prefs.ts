import type { Prefs } from "@pond/schema/db";
import { useSelector } from "@tanstack/react-store";
import { Store } from "@tanstack/store";
import { useEffect } from "react";

interface PrefsState {
  readonly value: Prefs | null;
}

const prefsStore = new Store<PrefsState>({ value: null });

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

// Imperative section patch for non-React callers (e.g. ask history, recents).
// Optimistically updates the shared cache and rolls back on IPC failure.
export function patchPrefsSection<K extends keyof Prefs>(
  section: K,
  delta: Partial<Prefs[K]>,
): void {
  const cache = prefsStore.state.value;
  if (!cache) {
    // Prefs not hydrated yet: load first, then re-apply the patch.
    void load().then(() => patchPrefsSection(section, delta));
    return;
  }
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
}

export function loadPrefs(): Promise<Prefs> {
  return load();
}

export function usePrefs<K extends keyof Prefs>(
  section: K,
): [Prefs[K], (patch: Partial<Prefs[K]>) => void, boolean] {
  useEffect(() => {
    void load();
  }, []);

  const value = useSelector(prefsStore, (s) => s.value?.[section] ?? null);

  const patch = (delta: Partial<Prefs[K]>) => {
    patchPrefsSection(section, delta);
  };

  return [value ?? ({} as Prefs[K]), patch, value !== null];
}

// Reactive access to the whole prefs object (loads on first use). Use when a
// consumer needs more than one section, e.g. evaluating enricher `enabled()`
// predicates that read across `prefs.ai`.
export function usePrefsValue(): Prefs | null {
  useEffect(() => {
    void load();
  }, []);
  return useSelector(prefsStore, (s) => s.value);
}

export function getPrefsSnapshot(): Prefs | null {
  return prefsStore.state.value;
}

export async function reloadPrefs(): Promise<Prefs> {
  prefsStore.setState(() => ({ value: null }));
  inflight = null;
  return load();
}
