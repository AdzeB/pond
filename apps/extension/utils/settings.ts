import { storage } from "wxt/utils/storage";
import {
  DEFAULT_SETTINGS,
  normalizeStoredSettings,
  type PondSettings,
} from "./types";

/** Values are normalized on read so legacy stored shapes keep migrating. */
const item = storage.defineItem<unknown>("local:settings");

export async function getSettings(): Promise<PondSettings> {
  return normalizeStoredSettings(await item.getValue());
}

export async function setSettings(next: PondSettings): Promise<void> {
  await item.setValue(next);
}

export async function ensureSettings(): Promise<void> {
  if ((await item.getValue()) == null) {
    await item.setValue(DEFAULT_SETTINGS);
  }
}
