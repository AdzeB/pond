import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import {
  DEFAULT_LIBRARY_NAME,
  LIBRARY_SCHEMA_VERSION,
} from "../../shared/constants";

// A bundle's metadata.json id keys its local SQLite index (kept in userData, not the synced bundle).

// Sentinel id for an uncommitted pond, used until the first write materializes the bundle.
export const UNBOUND_POND_ID = "unbound";

// Pond identity (rename override, emoji avatar, accent color) lives in the
// bundle's metadata.json so it travels with the folder; the userData recents
// file only caches it for the switcher.
export interface PondIdentity {
  displayName: string | null;
  avatar: string | null;
  color: string | null;
}

interface LibraryMetadata extends Partial<PondIdentity> {
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

function readMetadata(root: string): Partial<LibraryMetadata> | null {
  try {
    const raw = readFileSync(join(root, "metadata.json"), "utf-8");
    const parsed = JSON.parse(raw) as Partial<LibraryMetadata> | undefined;
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

function writeMetadata(root: string, body: Partial<LibraryMetadata>): void {
  const file = join(root, "metadata.json");
  const tmp = join(root, ".metadata.json.tmp");
  mkdirSync(root, { recursive: true });
  writeFileSync(tmp, JSON.stringify(body, null, 2));
  renameSync(tmp, file);
}

// Identity from the bundle; null when the bundle has no readable metadata.
// `seeded` distinguishes "fields present" (even if null) from a pre-identity
// metadata.json that was never migrated.
export function readPondIdentity(
  root: string,
): (PondIdentity & { seeded: boolean }) | null {
  const parsed = readMetadata(root);
  if (!parsed) return null;
  const seeded =
    "displayName" in parsed || "avatar" in parsed || "color" in parsed;
  return {
    displayName: cleanField(parsed.displayName),
    avatar: cleanField(parsed.avatar),
    color: cleanField(parsed.color),
    seeded,
  };
}

// Merge identity fields into the bundle's metadata.json. Only provided fields
// change; `null` clears back to the default.
export function writePondIdentity(
  root: string,
  patch: Partial<PondIdentity>,
): void {
  if (!existsSync(root)) return;
  const current = readMetadata(root) ?? {};
  const next: Partial<LibraryMetadata> = { ...current };
  if (patch.displayName !== undefined) {
    next.displayName = cleanField(patch.displayName);
  }
  if (patch.avatar !== undefined) next.avatar = cleanField(patch.avatar);
  if (patch.color !== undefined) next.color = cleanField(patch.color);
  writeMetadata(root, next);
}

function cleanField(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}
