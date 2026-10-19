import { storage } from "wxt/utils/storage";
import type { JsonValue } from "./json";
import {
  DEFAULT_SETTINGS,
  normalizeStoredSettings,
  type PondSettings,
} from "./types";

const item = storage.defineItem<JsonValue>("local:settings");

export async function getSettings(): Promise<PondSettings> {
  return normalizeStoredSettings(await item.getValue());
}

export async function ensureSettings(): Promise<void> {
  if ((await item.getValue()) == null) {
    await item.setValue(DEFAULT_SETTINGS);
  }
}

export async function updateSettings(
  change: (current: PondSettings) => PondSettings,
): Promise<PondSettings> {
  const next = change(await getSettings());
  await item.setValue(next);
  return next;
}

export function watchSettings(
  listener: (settings: PondSettings) => void,
): () => void {
  return item.watch((value) => listener(normalizeStoredSettings(value)));
}
