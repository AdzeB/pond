import { existsSync } from "node:fs";
import {
  DEFAULT_PREFS,
  type DeepPartial,
  type Prefs,
  type PrefsPatchDeep,
  PrefsSchema,
  type StoredPrefsEnvelope,
  type StoredPrefsEnvelopeV2,
} from "@pond/schema/db";
import { z } from "zod";
import { readBundleJson, writeBundleJson } from "../lib/library-config";
import { resolvePondId, UNBOUND_POND_ID } from "../lib/pond-identity";
import { resolvePaths } from "../paths";

const POND_PREF_KEYS = [
  "preferences",
  "sourcesView",
  "sync",
  "storage",
  "trash",
  "ai",
  "tagPicker",
  "allTags",
  "saveRecents",
] as const satisfies readonly (keyof Prefs)[];

type PondPrefKey = (typeof POND_PREF_KEYS)[number];
type AppPrefKey = Exclude<keyof Prefs, PondPrefKey>;

export type PondPrefs = Pick<Prefs, PondPrefKey>;
export type AppPrefs = Pick<Prefs, AppPrefKey>;

export interface StoredPrefs {
  version: 3;
  app: DeepPartial<AppPrefs>;
  pending: DeepPartial<PondPrefs> | null;
}

const APP_PREF_KEYS = [
  "window",
  "quickCapture",
  "autoImport",
  "api",
  "updates",
  "agent",
] as const satisfies readonly AppPrefKey[];

const _DEFAULT_APP_PREFS: AppPrefs = pickPrefs(DEFAULT_PREFS, APP_PREF_KEYS);
const _DEFAULT_POND_PREFS: PondPrefs = pickPrefs(DEFAULT_PREFS, POND_PREF_KEYS);

export function currentPondId(): string {
  const paths = resolvePaths();
  const committed = existsSync(paths.libraryRoot);
  return resolvePondId(paths.libraryRoot, committed);
}

export function isUnboundPondId(pondId: string): boolean {
  return pondId === UNBOUND_POND_ID;
}

const StoredSliceSchema = z.custom<PrefsPatchDeep>(
  (value) => value instanceof Object && !Array.isArray(value),
);

export type StoredPrefsInput =
  | StoredPrefsEnvelope
  | StoredPrefsEnvelopeV2
  | PrefsPatchDeep
  | string
  | number
  | boolean
  | null
  | undefined;

const StoredPrefsV3Schema = z.object({
  version: z.literal(3),
  app: StoredSliceSchema,
  pending: StoredSliceSchema.nullish(),
});

const StoredPrefsV2Schema = z.object({
  version: z.literal(2),
  app: StoredSliceSchema.optional(),
  ponds: z.record(z.string(), StoredSliceSchema).optional(),
});

function storedSlice(value: PrefsPatchDeep | null | undefined): PrefsPatchDeep {
  return value ?? {};
}

function isStoredPrefs(
  stored: StoredPrefsInput,
): stored is StoredPrefsInput & StoredPrefs {
  return StoredPrefsV3Schema.safeParse(stored).success;
}

export function normalizeStoredPrefs(stored: StoredPrefsInput): StoredPrefs {
  if (isStoredPrefs(stored)) return stored;

  const v2 = StoredPrefsV2Schema.safeParse(stored);
  if (v2.success) {
    return {
      version: 3,
      app: storedSlice(v2.data.app),
      pending: storedSlice(v2.data.ponds?.[UNBOUND_POND_ID]) ?? null,
    };
  }

  const flat = PrefsSchema.safeParse(stored);
  if (flat.success && StoredSliceSchema.safeParse(stored).success) {
    return {
      version: 3,
      app: pickPrefs(flat.data, APP_PREF_KEYS),
      pending: pickPrefs(flat.data, POND_PREF_KEYS),
    };
  }

  return { version: 3, app: {}, pending: null };
}

function mergeAll(base: Prefs, patch: DeepPartial<Prefs>): Prefs {
  return PrefsSchema.parse({
    preferences: { ...base.preferences, ...patch.preferences },
    trash: { ...base.trash, ...patch.trash },
    window: { ...base.window, ...patch.window },
    quickCapture: { ...base.quickCapture, ...patch.quickCapture },
    autoImport: { ...base.autoImport, ...patch.autoImport },
    tagPicker: { ...base.tagPicker, ...patch.tagPicker },
    allTags: { ...base.allTags, ...patch.allTags },
    sourcesView: { ...base.sourcesView, ...patch.sourcesView },
    api: { ...base.api, ...patch.api },
    updates: { ...base.updates, ...patch.updates },
    sync: { ...base.sync, ...patch.sync },
    storage: { ...base.storage, ...patch.storage },
    ai: { ...base.ai, ...patch.ai },
    agent: { ...base.agent, ...patch.agent },
    saveRecents: { ...base.saveRecents, ...patch.saveRecents },
  });
}

export function mergePrefs(
  app: DeepPartial<AppPrefs>,
  pond: DeepPartial<PondPrefs>,
): Prefs {
  return mergeAll(mergeAll(DEFAULT_PREFS, app), pond);
}

export function mergePondSlice(
  base: DeepPartial<PondPrefs>,
  patch: DeepPartial<PondPrefs> = {},
): PondPrefs {
  return pickPrefs(
    mergeAll(mergeAll(DEFAULT_PREFS, base), patch),
    POND_PREF_KEYS,
  );
}

export function mergeAppSlice(
  base: DeepPartial<AppPrefs>,
  patch: DeepPartial<AppPrefs> = {},
): AppPrefs {
  return pickPrefs(
    mergeAll(mergeAll(DEFAULT_PREFS, base), patch),
    APP_PREF_KEYS,
  );
}

export function readBundlePondPrefs(): DeepPartial<PondPrefs> | null {
  const paths = resolvePaths();
  if (!existsSync(paths.settingsFile)) return null;
  const read = readBundleJson<Partial<PondPrefs>>(
    paths.settingsFile,
    paths.backupDir,
  );
  const slice = StoredSliceSchema.safeParse(read?.data);
  return slice.success ? storedSlice(slice.data) : null;
}

export function writeBundlePondPrefs(slice: DeepPartial<PondPrefs>): void {
  writeBundleJson(resolvePaths().settingsFile, slice);
}

export interface SplitPrefsPatch {
  app: DeepPartial<AppPrefs>;
  pond: DeepPartial<PondPrefs>;
}

export function splitPrefsPatch(patch: DeepPartial<Prefs>): SplitPrefsPatch {
  const pond: DeepPartial<PondPrefs> = {};
  const app: DeepPartial<AppPrefs> = {};
  for (const key of POND_PREF_KEYS) {
    if (patch[key] !== undefined) assignSlice(pond, key, patch[key]);
  }
  for (const key of APP_PREF_KEYS) {
    if (patch[key] !== undefined) assignSlice(app, key, patch[key]);
  }
  return { app, pond };
}

function assignSlice<T extends object, K extends keyof Prefs>(
  target: T,
  key: K,
  value: DeepPartial<Prefs>[K],
): void {
  // SAFETY: `key` indexes both objects with the same `Prefs` key, so the value type matches.
  (target as Record<K, DeepPartial<Prefs>[K]>)[key] = value;
}

function pickPrefs<K extends keyof Prefs>(
  prefs: Prefs,
  keys: readonly K[],
): Pick<Prefs, K> {
  // SAFETY: filled from `keys` on the line below, which is exactly the picked key set.
  const out = {} as Pick<Prefs, K>;
  for (const key of keys) out[key] = prefs[key];
  return out;
}
