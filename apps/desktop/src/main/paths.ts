import { existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { app } from "electron";
import { readLibraryPointer } from "./lib/library-pointer";
import { resolvePondId } from "./lib/pond-identity";

export interface PondPaths {
  appData: string;
  cache: string;
  logs: string;
  // App-global state (settings, prefs, onboarded). One file, shared by
  // every pond.
  globalDb: string;
  // The active pond's index cache: `indexes/<pondId>.db`. Switching ponds
  // switches this file, so a fresh pond starts empty.
  indexDb: string;
  indexesDir: string;
  config: string;
  libraryRoot: string;
  itemsDir: string;
  trashDir: string;
  libraryMetadata: string;
}

let cached: PondPaths | null = null;

function ensureDir(p: string): string {
  if (!existsSync(p)) mkdirSync(p, { recursive: true });
  return p;
}

export function defaultLibraryRoot(): string {
  return join(app.getPath("home"), "Pond", "My Pond.pond");
}

// Bust the cache. Call this after writing a new pointer so the next
// call to resolvePaths() picks up the user's choice. In practice we
// always pair this with `app.relaunch(); app.exit(0)`; live re-pointing
// is hard because many modules captured the old paths at boot.
export function invalidatePaths(): void {
  cached = null;
}

export function resolvePaths(libraryRootOverride?: string): PondPaths {
  if (cached && !libraryRootOverride) return cached;

  const appData = ensureDir(app.getPath("userData"));
  const cache = ensureDir(join(appData, "cache"));
  const logs = ensureDir(app.getPath("logs"));
  const indexesDir = ensureDir(join(appData, "indexes"));

  const pointer = readLibraryPointer();
  const root = libraryRootOverride ?? pointer ?? defaultLibraryRoot();
  // Only materialize the bundle once the user has committed to a library:
  // an explicit override, a saved pointer, or a root that already exists.
  // A fresh, not-yet-onboarded user gets the path without us creating
  // `~/Pond/My Pond.pond` on disk. Onboarding (or the first write) creates
  // it via materializeLibrary() when the user actually proceeds.
  const committed =
    libraryRootOverride != null || pointer != null || existsSync(root);
  if (committed) ensureLibraryDirs(root);

  const pondId = resolvePondId(root, committed);

  const paths: PondPaths = {
    appData,
    cache,
    logs,
    globalDb: join(appData, "global.db"),
    indexDb: join(indexesDir, `${pondId}.db`),
    indexesDir,
    config: join(appData, "config.json"),
    libraryRoot: root,
    itemsDir: join(root, "items"),
    trashDir: join(root, "trash"),
    libraryMetadata: join(root, "metadata.json"),
  };

  cached = paths;
  return paths;
}

function ensureLibraryDirs(root: string): void {
  ensureDir(root);
  ensureDir(join(root, "items"));
  ensureDir(join(root, "trash"));
}

// Create the active library's bundle on disk (root + items/ + trash/).
// Onboarding calls this when the user proceeds so the pond appears only
// then, not at boot. Writers (writeItemFiles, moveToTrash) also mkdir on
// demand, so this is about making the folder show up promptly.
export function materializeLibrary(): string {
  const root = resolvePaths().libraryRoot;
  ensureLibraryDirs(root);
  return root;
}

export function itemDir(id: string): string {
  return join(resolvePaths().itemsDir, `${id}.info`);
}

export function itemFile(id: string, file: string): string {
  return join(itemDir(id), file);
}

export function appDataRoot(): string {
  return resolvePaths().appData;
}

export function libraryRoot(): string {
  return resolvePaths().libraryRoot;
}

export function itemsRoot(): string {
  return resolvePaths().itemsDir;
}

export function trashRoot(): string {
  return resolvePaths().trashDir;
}
