import { type Prefs, PrefsSchema } from "@pond/schema";
import type { WirePrefsPatch } from "@shared/wire";
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
    const next = PrefsSchema.parse(
      await window.pond.query("settings.getPrefs", {}),
    );
    prefsStore.setState(() => ({ value: next }));
    inflight = null;
    return next;
  })();
  return inflight;
}

export function patchPrefsSection<K extends keyof Prefs>(
  section: K,
  delta: Partial<Prefs[K]>,
): void {
  const cache = prefsStore.state.value;
  if (!cache) {
    void load().then(() => patchPrefsSection(section, delta));
    return;
  }
  const merged: Prefs = {
    ...cache,
    [section]: { ...cache[section], ...delta },
  };
  prefsStore.setState(() => ({ value: merged }));
  const message: WirePrefsPatch = { [section]: delta };
  void window.pond.query("settings.setPrefs", message).catch(() => {
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

  // SAFETY: a section is missing only until the first load resolves; the third
  // tuple element reports that, and callers read its fields with `?.`/`??`.
  return [value ?? ({} as Prefs[K]), patch, value !== null];
}

export function usePrefsValue(): Prefs | null {
  useEffect(() => {
    void load();
  }, []);
  return useSelector(prefsStore, (s) => s.value);
}

export function getPrefsSnapshot(): Prefs | null {
  return prefsStore.state.value;
}
