import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, isAbsolute, join, resolve } from "node:path";
import { app } from "electron";

// A small registry of every library the user has opened, so the
// switcher can list them (Eagle-style) and jump between them without
// re-picking from disk each time. Lives next to the library pointer in
// userData so it survives a corrupted index and is readable before the
// DB opens.
const RECENTS_FILE = "library-recents.json";

export interface KnownLibrary {
  path: string;
  name: string;
  addedAt: number;
  lastOpenedAt: number;
  // A user-chosen avatar (an emoji) shown in the switcher. `null` means
  // fall back to the name's initials.
  avatar: string | null;
}

interface RecentsFile {
  schemaVersion: 1;
  libraries: KnownLibrary[];
}

function recentsPath(): string {
  return join(app.getPath("userData"), RECENTS_FILE);
}

function normalize(path: string): string {
  const abs = isAbsolute(path) ? path : resolve(path);
  return abs.replace(/\/+$/, "");
}

export function libraryNameFromPath(path: string): string {
  const base = basename(normalize(path)).replace(/\.(pond|library)$/, "");
  return base.length > 0 ? base : "Library";
}

function read(): KnownLibrary[] {
  try {
    const raw = readFileSync(recentsPath(), "utf-8");
    const parsed = JSON.parse(raw) as Partial<RecentsFile>;
    if (!Array.isArray(parsed.libraries)) return [];
    return parsed.libraries
      .filter(
        (l): l is KnownLibrary =>
          typeof l?.path === "string" && l.path.length > 0,
      )
      .map((l) => ({
        ...l,
        avatar: typeof l.avatar === "string" ? l.avatar : null,
      }));
  } catch {
    return [];
  }
}

function write(libraries: KnownLibrary[]): void {
  const body: RecentsFile = { schemaVersion: 1, libraries };
  const file = recentsPath();
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, JSON.stringify(body, null, 2));
}

// Stored order is the source of truth so the user's drag-reordering in
// the switcher survives restarts. New libraries land at the top.
export function readKnownLibraries(): KnownLibrary[] {
  return read();
}

// Upsert a library and stamp it as just-opened. Called on boot for the
// active library and whenever the user switches or creates one. An
// existing entry keeps its position so a switch never reshuffles the
// list the user arranged by hand.
export function rememberLibrary(path: string): KnownLibrary {
  const abs = normalize(path);
  const now = Date.now();
  const libraries = read();
  const existing = libraries.find((l) => normalize(l.path) === abs);
  if (existing) {
    existing.lastOpenedAt = now;
    existing.name = libraryNameFromPath(abs);
    write(libraries);
    return existing;
  }
  const entry: KnownLibrary = {
    path: abs,
    name: libraryNameFromPath(abs),
    addedAt: now,
    lastOpenedAt: now,
    avatar: null,
  };
  libraries.unshift(entry);
  write(libraries);
  return entry;
}

// Persist the explicit order the user dragged the libraries into. Paths
// not present in `order` keep their prior relative order at the end, so
// a stale list from the renderer can't drop entries.
export function setLibraryOrder(order: string[]): void {
  const libraries = read();
  const byPath = new Map(libraries.map((l) => [normalize(l.path), l]));
  const next: KnownLibrary[] = [];
  for (const path of order) {
    const lib = byPath.get(normalize(path));
    if (lib) {
      next.push(lib);
      byPath.delete(normalize(path));
    }
  }
  for (const lib of libraries) {
    if (byPath.has(normalize(lib.path))) next.push(lib);
  }
  write(next);
}

// Set (or clear, with `null`) the avatar for a known library. A blank
// string clears it so the switcher falls back to the name's initials.
export function setLibraryAvatar(path: string, avatar: string | null): void {
  const abs = normalize(path);
  const libraries = read();
  const lib = libraries.find((l) => normalize(l.path) === abs);
  if (!lib) return;
  const trimmed = avatar?.trim() ?? "";
  lib.avatar = trimmed.length > 0 ? trimmed : null;
  write(libraries);
}

export function forgetLibrary(path: string): void {
  const abs = normalize(path);
  write(read().filter((l) => normalize(l.path) !== abs));
}

// Drop entries whose folder no longer exists so the switcher doesn't
// list dead paths forever. Keeps the active path regardless.
export function pruneMissingLibraries(keep: string): void {
  const keepAbs = normalize(keep);
  write(
    read().filter(
      (l) => normalize(l.path) === keepAbs || existsSync(normalize(l.path)),
    ),
  );
}
