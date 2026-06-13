import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, isAbsolute, join, resolve } from "node:path";
import { app } from "electron";

// Registry of opened libraries for the switcher; in userData, readable before the DB opens.
const RECENTS_FILE = "library-recents.json";

export interface KnownLibrary {
  path: string;
  name: string;
  addedAt: number;
  lastOpenedAt: number;
  // Emoji avatar for the switcher; `null` falls back to initials.
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

function libraryNameFromPath(path: string): string {
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

// Stored order survives restarts; new libraries land at the top.
export function readKnownLibraries(): KnownLibrary[] {
  return read();
}

// Upsert a library, stamp it just-opened; existing entries keep their position.
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

// Persist drag order; paths missing from `order` keep their prior order at the end.
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

// Set or clear (null/blank) a library's avatar.
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

// Drop entries whose folder is gone; always keeps the active path.
export function pruneMissingLibraries(keep: string): void {
  const keepAbs = normalize(keep);
  write(
    read().filter(
      (l) => normalize(l.path) === keepAbs || existsSync(normalize(l.path)),
    ),
  );
}
