import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  DEFAULT_LIBRARY_NAME,
  LIBRARY_SCHEMA_VERSION,
} from "../../shared/constants";

// Each `.pond` bundle carries a stable id in its `metadata.json`. That id
// keys the bundle's local SQLite index (`indexes/<id>.db` under userData),
// so switching ponds switches index files instead of sharing one global
// database. The index is a rebuildable cache and must NOT live inside the
// bundle: a live SQLite file would corrupt when synced over iCloud /
// Dropbox. The id lets us name the cache deterministically without
// hashing a path that can move.

// Used before a pond is committed (fresh user). The app still needs *a*
// pond handle for empty-state queries; this throwaway id gives it one
// without touching a real bundle. The first write materializes the real
// bundle, after which the stable metadata id takes over.
export const UNBOUND_POND_ID = "unbound";

interface LibraryMetadata {
  id: string;
  name: string;
  createdAt: number;
  schemaVersion: number;
  appVersion: string;
}

// Resolve the index key for a library root. Committed, on-disk bundles get
// their stable metadata id (created on first sight). Anything else is the
// unbound sentinel so we never materialize a bundle just to resolve paths.
export function resolvePondId(root: string, committed: boolean): string {
  if (committed && existsSync(root)) {
    const id = readOrCreatePondId(root);
    if (id) return id;
  }
  return UNBOUND_POND_ID;
}

// Read the bundle's id from `metadata.json`, writing a fresh metadata file
// (with a new id) if it's missing or unreadable. Synchronous so it can run
// inside `resolvePaths`.
export function readOrCreatePondId(root: string): string {
  const file = join(root, "metadata.json");
  try {
    const parsed = JSON.parse(readFileSync(file, "utf-8")) as
      | Partial<LibraryMetadata>
      | undefined;
    if (typeof parsed?.id === "string" && parsed.id.length > 0) {
      return parsed.id;
    }
  } catch {
    // Missing or corrupt: fall through and write a fresh metadata file.
  }
  const body: LibraryMetadata = {
    id: randomId(),
    name: DEFAULT_LIBRARY_NAME,
    createdAt: Date.now(),
    schemaVersion: LIBRARY_SCHEMA_VERSION,
    appVersion: process.env.npm_package_version ?? "0.1.0",
  };
  try {
    mkdirSync(root, { recursive: true });
    writeFileSync(file, JSON.stringify(body, null, 2));
  } catch {
    // Best-effort: if we can't persist, the returned id still keys the
    // index for this session.
  }
  return body.id;
}

function randomId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}
