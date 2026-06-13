import { storage } from "wxt/utils/storage";
import {
  DEFAULT_SETTINGS,
  normalizeStoredSettings,
  type PondSettings,
} from "./types";

// Typed wrapper around the single `local:settings` key. Values are normalized
// on read so legacy shapes (e.g. the old `endpoint` URL) keep migrating.
const item = storage.defineItem<unknown>("local:settings");

export async function getSettings(): Promise<PondSettings> {
  return normalizeStoredSettings(await item.getValue());
}

export async function setSettings(next: PondSettings): Promise<void> {
  await item.setValue(next);
}

export function watchSettings(
  callback: (settings: PondSettings) => void,
): () => void {
  return item.watch((value) => callback(normalizeStoredSettings(value)));
}

// Seed defaults on first install so the popup has a concrete value to edit.
export async function ensureSettings(): Promise<void> {
  if ((await item.getValue()) == null) {
    await item.setValue(DEFAULT_SETTINGS);
  }
}
