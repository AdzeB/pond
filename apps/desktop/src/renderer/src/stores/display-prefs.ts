import { useSelector } from "@tanstack/react-store";
import { Store } from "@tanstack/store";

export type DisplayPrefKey = "name" | "date" | "fileCount" | "source" | "type";

export interface DisplayPrefs {
  name: boolean;
  date: boolean;
  fileCount: boolean;
  source: boolean;
  type: boolean;
}

const STORAGE_KEYS: Record<DisplayPrefKey, string> = {
  name: "pond.display.name",
  date: "pond.display.date",
  fileCount: "pond.display.fileCount",
  source: "pond.display.source",
  type: "pond.display.type",
};

export const DISPLAY_DEFAULTS: DisplayPrefs = {
  name: true,
  date: true,
  fileCount: true,
  source: true,
  type: true,
};

function readKey(key: DisplayPrefKey): boolean {
  if (typeof window === "undefined") return DISPLAY_DEFAULTS[key];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEYS[key]);
    if (raw == null) return DISPLAY_DEFAULTS[key];
    return raw === "1";
  } catch {
    return DISPLAY_DEFAULTS[key];
  }
}

function readAll(): DisplayPrefs {
  return {
    name: readKey("name"),
    date: readKey("date"),
    fileCount: readKey("fileCount"),
    source: readKey("source"),
    type: readKey("type"),
  };
}

const store = new Store<DisplayPrefs>(readAll());

export function setDisplayPref(key: DisplayPrefKey, value: boolean): void {
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(STORAGE_KEYS[key], value ? "1" : "0");
    } catch {
      /** Storage denied: keep the in-memory store in sync anyway. */
    }
  }
  store.setState((s) => (s[key] === value ? s : { ...s, [key]: value }));
}

export function useDisplayPrefs(): DisplayPrefs {
  return useSelector(store, (s) => s);
}
