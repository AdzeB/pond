import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  DEFAULT_LIBRARY_NAME,
  LIBRARY_SCHEMA_VERSION,
} from "../../shared/constants";

// A bundle's metadata.json id keys its local SQLite index (kept in userData, not the synced bundle).

// Sentinel id for an uncommitted pond, used until the first write materializes the bundle.
export const UNBOUND_POND_ID = "unbound";

interface LibraryMetadata {
  id: string;
  name: string;
  createdAt: number;
  schemaVersion: number;
  appVersion: string;
}

// Index key for a library root: the bundle's metadata id, else the unbound sentinel.
export function resolvePondId(root: string, committed: boolean): string {
  if (committed && existsSync(root)) {
    const id = readOrCreatePondId(root);
    if (id) return id;
  }
  return UNBOUND_POND_ID;
}

// Read the bundle id from metadata.json, writing a fresh file if missing.
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
    // Best-effort; the returned id still keys the index this session.
  }
  return body.id;
}

function randomId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}
