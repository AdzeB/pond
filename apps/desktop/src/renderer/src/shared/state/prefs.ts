import { DEFAULT_PREFS, type Prefs, PrefsSchema } from "@pond/schema";
import type { WirePrefsPatch } from "@shared/wire";
import { useSelector } from "@tanstack/react-store";
import { Store } from "@tanstack/store";
import { useEffect } from "react";
import { notify } from "@/shared/lib/toast";

interface PrefsState {
  readonly value: Prefs | null;
}

const prefsStore = new Store<PrefsState>({ value: null });

let subscribed = false;
let prefsRevision = 0;
function subscribeToPrefs(): void {
  if (subscribed || !window.pond.onPrefsChanged) return;
  subscribed = true;
  window.pond.onPrefsChanged((prefs) => {
    prefsRevision += 1;
    prefsStore.setState(() => ({ value: PrefsSchema.parse(prefs) }));
  });
}

let inflight: Promise<Prefs> | null = null;

async function load(): Promise<Prefs> {
  subscribeToPrefs();
  if (prefsStore.state.value) return prefsStore.state.value;
  if (inflight) return inflight;
  inflight = refreshPrefs().finally(() => {
    inflight = null;
  });
  return inflight;
}

async function refreshPrefs(): Promise<Prefs> {
  const revision = prefsRevision;
  const next = PrefsSchema.parse(
    await window.pond.query("settings.getPrefs", {}),
  );
  if (revision === prefsRevision) prefsStore.setState(() => ({ value: next }));
  return prefsStore.state.value ?? next;
}

export function patchPrefsSection<K extends keyof Prefs>(
  section: K,
  delta: Partial<Prefs[K]>,
): Promise<void> {
  return savePrefsSection(section, delta).catch(() => {
    notify({
      id: "settings-save-error",
      title: "Couldn't save this setting",
      description: "Your previous setting is unchanged. Try again.",
      timeout: 8000,
    });
  });
}

export function loadPrefs(): Promise<Prefs> {
  return load();
}

export function usePrefs<K extends keyof Prefs>(
  section: K,
): [Prefs[K], (patch: Partial<Prefs[K]>) => Promise<void>, boolean] {
  useEffect(() => {
    void load().catch(() =>
      notify({
        id: "settings-load-error",
        title: "Couldn't load settings",
        description: "Open Settings again to retry.",
        timeout: 8000,
      }),
    );
  }, []);

  const value = useSelector(prefsStore, (s) => s.value?.[section] ?? null);

  const patch = (delta: Partial<Prefs[K]>) => {
    return patchPrefsSection(section, delta);
  };

  return [value ?? DEFAULT_PREFS[section], patch, value !== null];
}

export function getPrefsSnapshot(): Prefs | null {
  return prefsStore.state.value;
}

export function subscribePrefsSnapshot(listener: () => void): () => void {
  const subscription = prefsStore.subscribe(listener);
  return () => subscription.unsubscribe();
}

let saveQueue = Promise.resolve();

export function savePrefsSection<K extends keyof Prefs>(
  section: K,
  delta: Partial<Prefs[K]>,
): Promise<void> {
  const operation = saveQueue.then(async () => {
    await load();
    const message: WirePrefsPatch = { [section]: delta };
    const revision = prefsRevision;
    const result = await window.pond.query("settings.setPrefs", message);
    if (revision === prefsRevision)
      prefsStore.setState(() => ({ value: PrefsSchema.parse(result.prefs) }));
  });
  saveQueue = operation.catch(() => {});
  return operation;
}
