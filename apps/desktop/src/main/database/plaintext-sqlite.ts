import { randomUUID } from "node:crypto";
import {
  closeSync,
  constants,
  copyFileSync,
  existsSync,
  fsyncSync,
  openSync,
  readSync,
  renameSync,
  rmSync,
  statSync,
} from "node:fs";
import Database from "better-sqlite3";
import { z } from "zod";

const SQLITE_HEADER = Buffer.from("SQLite format 3\0", "utf8");
const CheckpointResultSchema = z.tuple([
  z.object({
    busy: z.number().int(),
    log: z.number().int(),
    checkpointed: z.number().int(),
  }),
]);

function syncFile(file: string): void {
  const descriptor = openSync(file, "r");
  try {
    fsyncSync(descriptor);
  } finally {
    closeSync(descriptor);
  }
}

export function needsDatabaseConversion(file: string): boolean {
  if (!existsSync(file) || statSync(file).size === 0) return false;
  const descriptor = openSync(file, "r");
  try {
    const header = Buffer.alloc(SQLITE_HEADER.length);
    return (
      readSync(descriptor, header, 0, header.length, 0) !== header.length ||
      !header.equals(SQLITE_HEADER)
    );
  } finally {
    closeSync(descriptor);
  }
}

function openLegacyDatabase(file: string, key: Uint8Array): Database.Database {
  if (key.byteLength !== 32)
    throw new Error("The existing database key is invalid.");
  const sqlite = new Database(file, { fileMustExist: true });
  try {
    sqlite.pragma("cipher='sqlcipher'");
    sqlite.pragma("legacy=4");
    sqlite.pragma(`key="x'${Buffer.from(key).toString("hex")}'"`);
    sqlite.prepare("SELECT count(*) FROM sqlite_master").get();
    return sqlite;
  } catch (error) {
    sqlite.close();
    throw error;
  }
}

export function convertLegacyDatabase(
  file: string,
  key: Uint8Array,
): string | null {
  if (!needsDatabaseConversion(file)) return null;
  const source = openLegacyDatabase(file, key);
  try {
    if (source.pragma("integrity_check", { simple: true }) !== "ok") {
      throw new Error("The existing database failed its integrity check.");
    }
    const [checkpoint] = CheckpointResultSchema.parse(
      source.pragma("wal_checkpoint(TRUNCATE)"),
    );
    if (checkpoint.busy !== 0 || checkpoint.log !== checkpoint.checkpointed) {
      throw new Error(
        "The database is in use. Close other connections before converting it.",
      );
    }
  } finally {
    source.close();
  }
  const backup = `${file}.encrypted-backup-${randomUUID()}`;
  const temporary = `${file}.plaintext-${randomUUID()}`;
  copyFileSync(file, backup, constants.COPYFILE_EXCL);
  syncFile(backup);
  try {
    copyFileSync(backup, temporary, constants.COPYFILE_EXCL);
    const converted = openLegacyDatabase(temporary, key);
    try {
      converted.pragma("journal_mode = DELETE");
      converted.pragma("rekey=''");
    } finally {
      converted.close();
    }
    const verified = new Database(temporary, { fileMustExist: true });
    try {
      if (verified.pragma("integrity_check", { simple: true }) !== "ok") {
        throw new Error("The converted database failed its integrity check.");
      }
    } finally {
      verified.close();
    }
    syncFile(temporary);
    renameSync(temporary, file);
    return backup;
  } finally {
    rmSync(temporary, { force: true });
  }
}

export async function convertLegacyDatabaseWithKeyCandidates(
  file: string,
  loadCandidates: readonly (() => Promise<Uint8Array>)[],
): Promise<string | null> {
  if (!needsDatabaseConversion(file)) return null;
  let firstError: unknown;
  let failed = false;
  for (const loadCandidate of loadCandidates) {
    let key: Uint8Array | undefined;
    try {
      key = await loadCandidate();
      return convertLegacyDatabase(file, key);
    } catch (error) {
      if (!failed) firstError = error;
      failed = true;
    } finally {
      key?.fill(0);
    }
  }
  if (failed) throw firstError;
  throw new Error("No legacy database keys are available.");
}
