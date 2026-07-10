import {
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { basename, dirname, join } from "node:path";
import log from "electron-log/main.js";

// Root JSONs inside the .pond bundle (settings.json, tags.json). Every file is
// a versioned envelope written atomically (tmp + rename) so a crash or a cloud
// sync racing the write never leaves a truncated file behind.

export const BUNDLE_JSON_SCHEMA = 1;

interface BundleEnvelope<T> {
  schemaVersion: number;
  updatedAt: number;
  data: T;
}

export interface BundleJsonRead<T> {
  updatedAt: number;
  data: T;
}

export function writeBundleJson<T>(file: string, data: T): void {
  const body: BundleEnvelope<T> = {
    schemaVersion: BUNDLE_JSON_SCHEMA,
    updatedAt: Date.now(),
    data,
  };
  mkdirSync(dirname(file), { recursive: true });
  const tmp = join(dirname(file), `.${basename(file)}.tmp`);
  writeFileSync(tmp, JSON.stringify(body, null, 2));
  renameSync(tmp, file);
}

// Read a root JSON; null when the file doesn't exist. A corrupt file falls
// back to the newest parseable copy in backupDir (when given) instead of
// silently resetting to defaults.
export function readBundleJson<T>(
  file: string,
  backupDir?: string,
): BundleJsonRead<T> | null {
  if (!existsSync(file)) return null;
  const direct = parseEnvelope<T>(file);
  if (direct) return direct;

  log.error("[pond bundle] corrupt root JSON, trying backups", file);
  if (backupDir) {
    const recovered = recoverFromBackups<T>(file, backupDir);
    if (recovered) {
      log.warn("[pond bundle] recovered from backup", file);
      return recovered;
    }
  }
  log.error("[pond bundle] no parseable backup found", file);
  return null;
}

function parseEnvelope<T>(file: string): BundleJsonRead<T> | null {
  try {
    const parsed = JSON.parse(readFileSync(file, "utf-8")) as
      | Partial<BundleEnvelope<T>>
      | undefined;
    if (!parsed || typeof parsed !== "object" || parsed.data === undefined) {
      return null;
    }
    return {
      updatedAt: typeof parsed.updatedAt === "number" ? parsed.updatedAt : 0,
      data: parsed.data,
    };
  } catch {
    return null;
  }
}

function recoverFromBackups<T>(
  file: string,
  backupDir: string,
): BundleJsonRead<T> | null {
  const name = basename(file);
  for (const dir of listBackupDirsNewestFirst(backupDir)) {
    const candidate = parseEnvelope<T>(join(backupDir, dir, name));
    if (candidate) return candidate;
  }
  return null;
}

function listBackupDirsNewestFirst(backupDir: string): string[] {
  try {
    return readdirSync(backupDir, { withFileTypes: true })
      .filter((e) => e.isDirectory())
      .map((e) => e.name)
      .sort()
      .reverse();
  } catch {
    return [];
  }
}

const BACKUP_KEEP = 10;

// Snapshot the given root JSONs into backup/<ISO-timestamp>/ and prune old
// snapshots to the last 10, mirroring Eagle's backup/ folder.
export function rotateBundleBackups(backupDir: string, files: string[]): void {
  const present = files.filter((f) => existsSync(f));
  if (present.length === 0) return;

  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const target = join(backupDir, stamp);
  try {
    mkdirSync(target, { recursive: true });
    for (const file of present) {
      cpSync(file, join(target, basename(file)));
    }
  } catch (err) {
    log.warn("[pond bundle] backup snapshot failed", err);
    return;
  }

  const dirs = listBackupDirsNewestFirst(backupDir);
  for (const dir of dirs.slice(BACKUP_KEEP)) {
    try {
      rmSync(join(backupDir, dir), { recursive: true, force: true });
    } catch (err) {
      log.warn("[pond bundle] backup prune failed", dir, err);
    }
  }
}

interface DebouncedTask {
  schedule(): void;
  flush(): Promise<void>;
}

// Coalesce bursts of writes (e.g. bulk tag edits) into one disk write ~1s later.
export function createDebouncedTask(
  fn: () => Promise<void>,
  waitMs = 1000,
): DebouncedTask {
  let timer: NodeJS.Timeout | null = null;

  const run = async (): Promise<void> => {
    try {
      await fn();
    } catch (err) {
      log.warn("[pond bundle] debounced task failed", err);
    }
  };

  return {
    schedule() {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        timer = null;
        void run();
      }, waitMs);
    },
    async flush() {
      if (!timer) return;
      clearTimeout(timer);
      timer = null;
      await run();
    },
  };
}
