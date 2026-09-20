import {
  closeSync,
  constants,
  copyFileSync,
  existsSync,
  fsyncSync,
  openSync,
  readFileSync,
  rmSync,
} from "node:fs";
import Database from "better-sqlite3";
import { z } from "zod";

export const DATABASE_KEY_BYTES = 32;
const SQLITE_HEADER = Buffer.from("SQLite format 3\0", "utf8");
const SqlCipherRowsSchema = z.array(
  z.record(z.string(), z.string().catch("")).nullable().catch(null),
);

function keyPragma(key: Uint8Array): string {
  if (key.byteLength !== DATABASE_KEY_BYTES) {
    throw new Error(`Database keys must contain ${DATABASE_KEY_BYTES} bytes.`);
  }
  return `key="x'${Buffer.from(key).toString("hex")}'"`;
}

export function configureSqlCipher(
  sqlite: Database.Database,
  key: Uint8Array,
): void {
  sqlite.pragma("cipher='sqlcipher'");
  sqlite.pragma("legacy=4");
  sqlite.pragma(keyPragma(key));
  sqlite.prepare("SELECT count(*) FROM sqlite_master").get();
}

export function rekeySqlCipher(
  sqlite: Database.Database,
  key: Uint8Array,
): void {
  sqlite.pragma(`re${keyPragma(key)}`);
  sqlite.prepare("SELECT count(*) FROM sqlite_master").get();
}

export function sqlCipherAvailable(): boolean {
  const sqlite = new Database(":memory:");
  try {
    const rows = SqlCipherRowsSchema.safeParse(sqlite.pragma("cipher"));
    return (
      rows.success &&
      rows.data.some(
        (row) =>
          row !== null && Object.values(row).some((value) => value.length > 0),
      )
    );
  } finally {
    sqlite.close();
  }
}

export function migratePlaintextSqlite(file: string, key: Uint8Array): string {
  const backup = `${file}.pre-encryption`;
  const plaintext = new Database(file);
  try {
    plaintext.pragma("wal_checkpoint(TRUNCATE)");
    const integrity = plaintext.pragma("integrity_check", { simple: true });
    if (integrity !== "ok") throw new Error("Plaintext database is corrupt.");
  } finally {
    plaintext.close();
  }

  if (!existsSync(backup)) {
    copyFileSync(file, backup, constants.COPYFILE_EXCL);
    const descriptor = openSync(backup, "r");
    try {
      fsyncSync(descriptor);
    } finally {
      closeSync(descriptor);
    }
  }
  if (!hasPlaintextHeader(backup)) {
    throw new Error("Plaintext database backup is invalid.");
  }

  const sqlite = new Database(file);
  try {
    sqlite.pragma("cipher='sqlcipher'");
    sqlite.pragma("legacy=4");
    rekeySqlCipher(sqlite, key);
    sqlite.close();
    const verified = new Database(file);
    try {
      configureSqlCipher(verified, key);
      const integrity = verified.pragma("integrity_check", { simple: true });
      if (integrity !== "ok") throw new Error("Encrypted database is corrupt.");
    } finally {
      verified.close();
    }
    return backup;
  } catch (error) {
    if (sqlite.open) sqlite.close();
    rmSync(`${file}-wal`, { force: true });
    rmSync(`${file}-shm`, { force: true });
    copyFileSync(backup, file);
    throw error;
  }
}

export function openEncryptedSqlite(
  file: string,
  key: Uint8Array,
): Database.Database {
  if (existsSync(file) && hasPlaintextHeader(file)) {
    migratePlaintextSqlite(file, key);
  }
  const sqlite = new Database(file);
  try {
    configureSqlCipher(sqlite, key);
    return sqlite;
  } catch (error) {
    sqlite.close();
    throw error;
  }
}

function hasPlaintextHeader(file: string): boolean {
  if (!existsSync(file)) return false;
  const contents = readFileSync(file);
  return contents.byteLength >= SQLITE_HEADER.byteLength
    ? contents.subarray(0, SQLITE_HEADER.byteLength).equals(SQLITE_HEADER)
    : false;
}
