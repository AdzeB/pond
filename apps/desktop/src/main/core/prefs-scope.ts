import { existsSync } from "node:fs";
import { DEFAULT_PREFS, type Prefs, PrefsSchema } from "@pond/schema/db";
import { readBundleJson, writeBundleJson } from "../lib/library-config";
import { resolvePondId, UNBOUND_POND_ID } from "../lib/pond-identity";
import { resolvePaths } from "../paths";

/** Prefs slices that travel with the bundle (settings.json); everything else is app-global. */
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

/** Stored global.db prefs blob: the app slice plus a "pending" library slice consumed by the first bundle open. */
export interface StoredPrefs {
  version: 3;
  app: Partial<AppPrefs>;
  pending: Partial<PondPrefs> | null;
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

export function isUnboundPondId(pondId: string): boolean {
  return pondId === UNBOUND_POND_ID;
}

function isStoredPrefs(stored: unknown): stored is StoredPrefs {
  return (
    typeof stored === "object" &&
    stored !== null &&
    (stored as StoredPrefs).version === 3 &&
    typeof (stored as StoredPrefs).app === "object"
  );
}

/** Coerces stored blobs to v3: a v2 blob keeps its app slice and unbound entry, dropping per-pond entries because the bundle's settings.json owns that data; a legacy flat blob is split by scope. */
export function normalizeStoredPrefs(stored: unknown): StoredPrefs {
  if (isStoredPrefs(stored)) return stored;

  if (
    typeof stored === "object" &&
    stored !== null &&
    (stored as { version?: unknown }).version === 2
  ) {
    const v2 = stored as {
      app?: Partial<AppPrefs>;
      ponds?: Record<string, Partial<PondPrefs>>;
    };
    return {
      version: 3,
      app: v2.app ?? {},
      pending: v2.ponds?.[UNBOUND_POND_ID] ?? null,
    };
  }

  if (typeof stored === "object" && stored !== null) {
    const parsed = PrefsSchema.safeParse(stored);
    if (parsed.success) {
      const flat = parsed.data as Prefs;
      return {
        version: 3,
        app: pickPrefs(flat, APP_PREF_KEYS),
        pending: pickPrefs(flat, POND_PREF_KEYS),
      };
    }
  }
  return { version: 3, app: {}, pending: null };
}

/** The app slice comes from global.db, the pond slice from the bundle's settings.json; both merge over their defaults. */
export function mergePrefs(
  app: Partial<AppPrefs>,
  pond: Partial<PondPrefs>,
): Prefs {
  return {
    ...(mergeSlice(DEFAULT_APP_PREFS, app) as AppPrefs),
    ...(mergeSlice(DEFAULT_POND_PREFS, pond) as PondPrefs),
  };
}

/** mergeSlice only merges keys present in its base, so widen to the full defaults first. */
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

/** The library slice lives inside the .pond bundle so it travels with the folder. */
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

/** Always writes the full slice so the file is self-describing on disk. */
export function writeBundlePondPrefs(slice: PondPrefs): void {
  writeBundleJson(resolvePaths().settingsFile, slice);
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
