import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, isAbsolute, join, resolve } from "node:path";
import { app } from "electron";

// Side-car in userData pointing at the user's library folder; read before the DB opens.
const POINTER_FILE = "library-location.json";

interface PointerFile {
  path: string;
  updatedAt: number;
  schemaVersion: 1;
}

function pointerPath(): string {
  return join(app.getPath("userData"), POINTER_FILE);
}

export function readLibraryPointer(): string | null {
  try {
    const raw = readFileSync(pointerPath(), "utf-8");
    const parsed = JSON.parse(raw) as Partial<PointerFile>;
    const candidate = parsed?.path;
    if (typeof candidate !== "string" || candidate.length === 0) return null;
    const abs = isAbsolute(candidate) ? candidate : resolve(candidate);
    // Refuse a pointer into userData: it would recurse (library inside its metadata).
    if (abs.startsWith(`${app.getPath("userData")}/`)) return null;
    return abs;
  } catch {
    return null;
  }
}

export function writeLibraryPointer(absPath: string): void {
  if (!isAbsolute(absPath)) {
    throw new Error("library pointer requires an absolute path");
  }
  const body: PointerFile = {
    path: absPath,
    updatedAt: Date.now(),
    schemaVersion: 1,
  };
  const file = pointerPath();
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, JSON.stringify(body, null, 2));
}

// Reports whether `target` is safe as a library root (exists/creatable, outside userData).
interface PointerSafetyReport {
  ok: boolean;
  reason?:
    | "inside_user_data"
    | "not_writable"
    | "not_a_directory"
    | "unknown_error";
}

export function checkPointerSafety(target: string): PointerSafetyReport {
  const abs = isAbsolute(target) ? target : resolve(target);
  if (abs.startsWith(`${app.getPath("userData")}/`)) {
    return { ok: false, reason: "inside_user_data" };
  }
  try {
    if (existsSync(abs)) {
      const st = statSync(abs);
      if (!st.isDirectory()) return { ok: false, reason: "not_a_directory" };
    } else {
      mkdirSync(abs, { recursive: true });
    }
    // Probe-write to catch read-only mounts, sandboxed paths, etc.
    const probe = join(abs, `.pond-probe-${Date.now()}`);
    writeFileSync(probe, "ok");
    try {
      readFileSync(probe);
    } finally {
      try {
        const { unlinkSync } = require("node:fs") as typeof import("node:fs");
        unlinkSync(probe);
      } catch {
        // probe cleanup best-effort
      }
    }
    return { ok: true };
  } catch (err) {
    if ((err as NodeJS.ErrnoException)?.code === "EACCES") {
      return { ok: false, reason: "not_writable" };
    }
    return { ok: false, reason: "unknown_error" };
  }
}

// Path markers for synced folders; surfaced in the relocate dialog.
const CLOUD_MARKERS: ReadonlyArray<{
  kind: CloudKind;
  patterns: ReadonlyArray<string>;
}> = [
  {
    kind: "iCloud",
    patterns: [
      "/Library/Mobile Documents/com~apple~CloudDocs/",
      "/Library/Mobile Documents/iCloud~",
    ],
  },
  { kind: "Dropbox", patterns: ["/Dropbox/", "/Dropbox (", "/.dropbox/"] },
  {
    kind: "Google Drive",
    patterns: ["/Google Drive/", "/GoogleDrive/", "/CloudStorage/GoogleDrive-"],
  },
  {
    kind: "OneDrive",
    patterns: ["/OneDrive/", "/OneDrive - ", "/CloudStorage/OneDrive-"],
  },
  { kind: "Box", patterns: ["/Box/", "/Box Sync/"] },
];

type CloudKind = "iCloud" | "Dropbox" | "Google Drive" | "OneDrive" | "Box";

export function detectCloudKind(absPath: string): CloudKind | null {
  const norm = absPath.endsWith("/") ? absPath : `${absPath}/`;
  for (const entry of CLOUD_MARKERS) {
    if (entry.patterns.some((p) => norm.includes(p))) return entry.kind;
  }
  return null;
}

// Detect an existing Pond library (`items/`, `metadata.json`, or
// `settings.json`) to default to "adopt".
interface ExistingLibraryProbe {
  exists: boolean;
  hasItemsDir: boolean;
  hasMetadataFile: boolean;
  itemCount: number;
  looksLikePondLibrary: boolean;
}

export function probeExistingLibrary(absPath: string): ExistingLibraryProbe {
  const out: ExistingLibraryProbe = {
    exists: false,
    hasItemsDir: false,
    hasMetadataFile: false,
    itemCount: 0,
    looksLikePondLibrary: false,
  };
  if (!existsSync(absPath)) return out;
  out.exists = true;
  const itemsDir = join(absPath, "items");
  const metadataFile = join(absPath, "metadata.json");
  const settingsFile = join(absPath, "settings.json");
  out.hasMetadataFile = existsSync(metadataFile) || existsSync(settingsFile);
  if (existsSync(itemsDir)) {
    out.hasItemsDir = true;
    try {
      const entries = readdirSync(itemsDir).filter((e) => e.endsWith(".info"));
      out.itemCount = entries.length;
    } catch {
      // Best-effort; a permission error reads the same as an empty folder.
    }
  }
  out.looksLikePondLibrary = out.hasItemsDir || out.hasMetadataFile;
  return out;
}
