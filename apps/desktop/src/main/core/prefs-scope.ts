import { existsSync } from "node:fs";
import {
  DEFAULT_PREFS,
  type Prefs,
  PrefsSchema,
  settings as settingsTable,
} from "@pond/schema/db";
import { eq } from "drizzle-orm";
import { getGlobalDb } from "../db";
import { readBundleJson, writeBundleJson } from "../lib/library-config";
import { readLibraryPointer } from "../lib/library-pointer";
import { resolvePondId, UNBOUND_POND_ID } from "../lib/pond-identity";
import { libraryRoot, resolvePaths } from "../paths";

// Prefs slices that describe a single library's data and should not leak across
// pond switches. Everything else is app-global (window, API, updates, etc.).
export const POND_PREF_KEYS = [
  "preferences",
  "analyticsView",
  "sourcesView",
  "sync",
  "skills",
  "storage",
  "trash",
  "ai",
  "tagPicker",
  "allTags",
  "askHistory",
  "saveRecents",
] as const satisfies readonly (keyof Prefs)[];

export type PondPrefKey = (typeof POND_PREF_KEYS)[number];
export type AppPrefKey = Exclude<keyof Prefs, PondPrefKey>;

export type PondPrefs = Pick<Prefs, PondPrefKey>;
export type AppPrefs = Pick<Prefs, AppPrefKey>;

export interface StoredPrefsV2 {
  version: 2;
  app: Partial<AppPrefs>;
  ponds: Record<string, Partial<PondPrefs>>;
}

const APP_PREF_KEYS = Object.keys(DEFAULT_PREFS).filter(
  (key) => !POND_PREF_KEYS.includes(key as PondPrefKey),
) as AppPrefKey[];

export const DEFAULT_APP_PREFS: AppPrefs = pickPrefs(
  DEFAULT_PREFS,
  APP_PREF_KEYS,
);
export const DEFAULT_POND_PREFS: PondPrefs = pickPrefs(
  DEFAULT_PREFS,
  POND_PREF_KEYS,
);

export function currentPondId(): string {
  const paths = resolvePaths();
  const committed = existsSync(paths.libraryRoot);
  return resolvePondId(paths.libraryRoot, committed);
}

export function isStoredPrefsV2(stored: unknown): stored is StoredPrefsV2 {
  return (
    typeof stored === "object" &&
    stored !== null &&
    (stored as StoredPrefsV2).version === 2 &&
    typeof (stored as StoredPrefsV2).app === "object" &&
    typeof (stored as StoredPrefsV2).ponds === "object"
  );
}

// Legacy installs persisted one flat prefs blob for every pond. On first read,
// park that blob under the library that owned it (library_root / pointer), not
// whichever pond happens to be open during the upgrade.
export function migrateStoredPrefs(
  stored: unknown,
  legacyOwnerPondId: string,
): StoredPrefsV2 {
  if (isStoredPrefsV2(stored)) return stored;

  const parsed = PrefsSchema.safeParse(stored);
  const flat = (parsed.success ? parsed.data : DEFAULT_PREFS) as Prefs;
  return {
    version: 2,
    app: pickPrefs(flat, APP_PREF_KEYS),
    ponds: { [legacyOwnerPondId]: pickPrefs(flat, POND_PREF_KEYS) },
  };
}

export async function resolveLegacyPrefsOwnerPondId(): Promise<string> {
  try {
    const db = await getGlobalDb();
    const rows = await db
      .select({ libraryRoot: settingsTable.libraryRoot })
      .from(settingsTable)
      .where(eq(settingsTable.id, "singleton"));
    const root = rows[0]?.libraryRoot ?? readLibraryPointer() ?? libraryRoot();
    const committed = existsSync(root);
    return resolvePondId(root, committed);
  } catch {
    return currentPondId();
  }
}

// Merge the app slice (global.db) and pond slice (bundle settings.json) over
// their defaults into one Prefs object.
export function mergePrefs(
  app: Partial<AppPrefs>,
  pond: Partial<PondPrefs>,
): Prefs {
  return {
    ...(mergeSlice(DEFAULT_APP_PREFS, app) as AppPrefs),
    ...(mergeSlice(DEFAULT_POND_PREFS, pond) as PondPrefs),
  };
}

// Full pond slice from a stored partial plus a patch. mergeSlice only merges
// keys present in its base, so we always widen to the full defaults first.
export function mergePondSlice(
  base: Partial<PondPrefs>,
  patch: DeepPartial<PondPrefs> = {},
): PondPrefs {
  const full = mergeSlice(DEFAULT_POND_PREFS, base) as PondPrefs;
  return mergeSlice(full, patch) as PondPrefs;
}

export function mergeAppSlice(
  base: Partial<AppPrefs>,
  patch: DeepPartial<AppPrefs> = {},
): AppPrefs {
  const full = mergeSlice(DEFAULT_APP_PREFS, base) as AppPrefs;
  return mergeSlice(full, patch) as AppPrefs;
}

// ---- Bundle settings.json: the pond slice lives inside the .pond bundle so
// it travels with the folder and can never leak across ponds. ----

export function isUnboundPondId(pondId: string): boolean {
  return pondId === UNBOUND_POND_ID;
}

export function readBundlePondPrefs(): Partial<PondPrefs> | null {
  const paths = resolvePaths();
  if (!existsSync(paths.settingsFile)) return null;
  const read = readBundleJson<Partial<PondPrefs>>(
    paths.settingsFile,
    paths.backupDir,
  );
  if (!read || typeof read.data !== "object" || read.data === null) {
    return null;
  }
  return read.data;
}

// Always writes the full slice so the file is self-describing on disk.
export function writeBundlePondPrefs(slice: PondPrefs): void {
  writeBundleJson(resolvePaths().settingsFile, slice);
}

// A pond key newly moved out of the app slice (e.g. `preferences`) is missing
// from bundles whose settings.json was seeded before the move. Adopt the
// legacy value from the stored global.db blob once, instead of silently
// resetting that slice to defaults.
export function adoptLegacyPondKeys(
  bundle: Partial<PondPrefs>,
  stored: StoredPrefsV2,
  pondId: string,
): { slice: Partial<PondPrefs>; changed: boolean } {
  // The raw app blob may still carry keys that used to be app-scoped; the
  // pond's own legacy entry wins when both exist.
  const legacy: Record<string, unknown> = {
    ...(stored.app as Record<string, unknown>),
    ...(legacyPondSeed(stored, pondId) as Record<string, unknown>),
  };
  const out: Record<string, unknown> = { ...bundle };
  let changed = false;
  for (const key of POND_PREF_KEYS) {
    if (out[key] !== undefined || legacy[key] === undefined) continue;
    out[key] = legacy[key];
    changed = true;
  }
  return { slice: out as Partial<PondPrefs>, changed };
}

// Legacy seed for a bundle that has no settings.json yet: the pond's own
// global.db slice, else the unbound slice (prefs set during onboarding before
// the bundle materialized).
export function legacyPondSeed(
  stored: StoredPrefsV2,
  pondId: string,
): Partial<PondPrefs> {
  return stored.ponds[pondId] ?? stored.ponds[UNBOUND_POND_ID] ?? {};
}

// While the pond is unbound (no bundle on disk yet) its slice parks in
// global.db under the sentinel id; the first bundle open consumes it.
export function applyUnboundPondPatch(
  stored: StoredPrefsV2,
  patch: DeepPartial<PondPrefs>,
): StoredPrefsV2 {
  return {
    ...stored,
    ponds: {
      ...stored.ponds,
      [UNBOUND_POND_ID]: mergePondSlice(
        stored.ponds[UNBOUND_POND_ID] ?? {},
        patch,
      ),
    },
  };
}

// Drop legacy per-pond entries from global.db once they've been migrated into
// the bundle's settings.json. Entries for other (not-yet-opened) ponds stay
// until their own bundle consumes them.
export function stripConsumedPondSlices(
  stored: StoredPrefsV2,
  pondId: string,
): { stored: StoredPrefsV2; changed: boolean } {
  const consumed = [pondId, UNBOUND_POND_ID].filter(
    (key) => stored.ponds[key] !== undefined,
  );
  if (consumed.length === 0) return { stored, changed: false };
  const ponds = { ...stored.ponds };
  for (const key of consumed) delete ponds[key];
  return { stored: { ...stored, ponds }, changed: true };
}

export function splitPrefsPatch(patch: DeepPartial<Prefs>): {
  app: DeepPartial<AppPrefs>;
  pond: DeepPartial<PondPrefs>;
} {
  const app: Record<string, unknown> = {};
  const pond: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(patch)) {
    if (value === undefined) continue;
    if (POND_PREF_KEYS.includes(key as PondPrefKey)) {
      pond[key] = value;
    } else {
      app[key] = value;
    }
  }
  return {
    app: app as DeepPartial<AppPrefs>,
    pond: pond as DeepPartial<PondPrefs>,
  };
}

// Apply the app half of a patch to the stored global.db blob. Pond slices no
// longer live here — they go to the bundle's settings.json.
export function applyAppPrefsPatch(
  stored: StoredPrefsV2,
  appPatch: DeepPartial<AppPrefs>,
): StoredPrefsV2 {
  if (Object.keys(appPatch).length === 0) return stored;
  return {
    ...stored,
    app: mergeAppSlice(stored.app, appPatch),
  };
}

type DeepPartial<T> = T extends object
  ? { [K in keyof T]?: DeepPartial<T[K]> }
  : T;

function pickPrefs<K extends keyof Prefs>(
  prefs: Prefs,
  keys: readonly K[],
): Pick<Prefs, K> {
  const out = {} as Pick<Prefs, K>;
  for (const key of keys) out[key] = prefs[key];
  return out;
}

function mergeSlice<T extends object>(
  base: T,
  patch: DeepPartial<T> | Partial<T> | undefined,
): T {
  if (!patch || typeof patch !== "object") return base;
  const baseRec = base as Record<string, unknown>;
  const patchRec = patch as Record<string, unknown>;
  const out: Record<string, unknown> = { ...baseRec };
  for (const key of Object.keys(baseRec)) {
    const baseVal = baseRec[key];
    const patchVal = patchRec[key];
    if (patchVal && typeof patchVal === "object" && !Array.isArray(patchVal)) {
      out[key] = { ...(baseVal as object), ...(patchVal as object) };
    } else if (patchVal !== undefined) {
      out[key] = patchVal;
    }
  }
  return out as T;
}
