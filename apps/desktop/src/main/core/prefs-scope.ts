import { existsSync } from "node:fs";
import {
  DEFAULT_PREFS,
  type Prefs,
  PrefsSchema,
  settings as settingsTable,
} from "@pond/schema/db";
import { eq } from "drizzle-orm";
import { getGlobalDb } from "../db";
import { readLibraryPointer } from "../lib/library-pointer";
import { resolvePondId } from "../lib/pond-identity";
import { libraryRoot, resolvePaths } from "../paths";

// Prefs slices that describe a single library's data and should not leak across
// pond switches. Everything else is app-global (theme, window, API, etc.).
export const POND_PREF_KEYS = [
  "analyticsView",
  "sourcesView",
  "sync",
  "skills",
  "storage",
  "trash",
  "ai",
  "tagPicker",
  "allTags",
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

export function mergeStoredPrefs(stored: StoredPrefsV2, pondId: string): Prefs {
  const app = mergeSlice(DEFAULT_APP_PREFS, stored.app) as AppPrefs;
  const pond = mergeSlice(
    DEFAULT_POND_PREFS,
    stored.ponds[pondId] ?? {},
  ) as PondPrefs;
  return { ...app, ...pond };
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

export function applyPrefsPatch(
  stored: StoredPrefsV2,
  pondId: string,
  patch: DeepPartial<Prefs>,
): StoredPrefsV2 {
  const { app, pond } = splitPrefsPatch(patch);
  const nextPond =
    Object.keys(pond).length > 0
      ? mergeSlice(stored.ponds[pondId] ?? {}, pond)
      : stored.ponds[pondId];

  return {
    version: 2,
    app:
      Object.keys(app).length > 0
        ? (mergeSlice(stored.app, app) as Partial<AppPrefs>)
        : stored.app,
    ponds:
      nextPond !== undefined
        ? { ...stored.ponds, [pondId]: nextPond as Partial<PondPrefs> }
        : stored.ponds,
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
