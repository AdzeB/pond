import { existsSync } from "node:fs";
import { join } from "node:path";
import type Database from "better-sqlite3";
import log from "electron-log/main.js";
import {
  KEYCHAIN_DATABASE_GLOBAL,
  KEYCHAIN_DATABASE_LIBRARY_PREFIX,
} from "../../shared/constants";
import { recoverBatchJournal } from "../core/batch-journal";
import { backfillFontActivationIndex } from "../core/font-activation";
import { hydrateOrganizationBundle } from "../core/organization-bundle";
import {
  clearLibraryKey,
  deriveLibrarySubkey,
  libraryKeyInstalled,
  loadLibraryKeyFromSecureStorage,
} from "../core/security/library-key-runtime";
import { LIBRARY_SECURITY_MANIFEST_FILENAME } from "../core/security/library-security-manifest";
import { backfillVecBatch } from "../core/vec-index";
import { ensureSecureSecretBytes } from "../keychain";
import { readOrCreatePondId } from "../lib/pond-identity";
import { backfillRawSlimBatch } from "../lib/raw-slim";
import { resolvePaths } from "../paths";
import { type Db, openSqlite, wrapSqlite } from "./client";
import { DATABASE_KEY_BYTES } from "./encrypted-sqlite";
import { migrateGlobal } from "./migrations";
import { initializePondSchema } from "./pond-schema";

let cachedPond: Db | null = null;
let cachedGlobal: Db | null = null;
let pondDbInflight: Promise<Db> | null = null;
let runLibraryMigration: ((db: Db) => Promise<void>) | null = null;

export function configureLibraryMigration(
  migration: (db: Db) => Promise<void>,
): void {
  runLibraryMigration = migration;
}

export async function getGlobalDb(): Promise<Db> {
  if (cachedGlobal) return cachedGlobal;
  const paths = resolvePaths();
  log.info("[pond db] opening global", paths.globalDb);
  const sqlite = await openSqliteWithKey(
    paths.globalDb,
    KEYCHAIN_DATABASE_GLOBAL,
  );
  migrateGlobal(sqlite);
  cachedGlobal = wrapSqlite(sqlite);
  return cachedGlobal;
}

export async function getDb(): Promise<Db> {
  if (cachedPond) return cachedPond;
  if (pondDbInflight) return pondDbInflight;

  pondDbInflight = openPondDb().finally(() => {
    pondDbInflight = null;
  });
  return pondDbInflight;
}

async function openPondDb(): Promise<Db> {
  await new Promise<void>((resolve) => setImmediate(resolve));

  const paths = resolvePaths();
  log.info("[pond db] opening pond index", paths.indexDb);

  const pondId = readOrCreatePondId(paths.libraryRoot);
  const securityManifest = join(
    paths.libraryRoot,
    LIBRARY_SECURITY_MANIFEST_FILENAME,
  );
  let sqlite: Database.Database;
  if (existsSync(securityManifest)) {
    if (!libraryKeyInstalled(pondId)) {
      throw new Error("The Library is locked.");
    }
    const databaseKey = deriveLibrarySubkey("database:index");
    try {
      sqlite = openSqlite(paths.indexDb, databaseKey);
    } finally {
      databaseKey.fill(0);
    }
  } else {
    sqlite = await openLegacyLibrarySqlite(paths.indexDb, pondId, [
      paths.libraryRoot,
      paths.thumbnailCache,
    ]);
  }
  let vectorEnabled: boolean;
  let opened: Db;
  try {
    vectorEnabled = initializePondSchema(sqlite);
    opened = wrapSqlite(sqlite);
    await recoverBatchJournal(
      paths.libraryRoot,
      (batchId) =>
        sqlite
          .prepare("SELECT 1 FROM mutation_commits WHERE batch_id = ?")
          .get(batchId) != null,
    );
    sqlite.exec("DELETE FROM mutation_commits");
    hydrateOrganizationBundle(opened, paths.libraryRoot);
  } catch (error) {
    sqlite.close();
    clearLibraryKey();
    throw error;
  }
  cachedPond = opened;

  ensureLibraryMetadata();

  scheduleDataMigrations(sqlite, vectorEnabled);

  return cachedPond;
}

function scheduleDataMigrations(
  sqlite: Database.Database,
  vectorEnabled: boolean,
): void {
  const runRawSlimBatch = (): void => {
    if (!sqlite.open || cachedPond?.$raw !== sqlite) return;
    try {
      const result = backfillRawSlimBatch(sqlite);
      if (result.processed > 0) {
        log.info("[pond db] raw-slim migration batch", result);
      }
      if (result.hasMore) setImmediate(runRawSlimBatch);
    } catch (err) {
      log.warn("[pond db] raw-slim migration failed", err);
    }
  };
  setImmediate(runRawSlimBatch);

  setImmediate(() => {
    if (!sqlite.open || cachedPond?.$raw !== sqlite) return;
    try {
      const updated = backfillFontActivationIndex(sqlite);
      if (updated > 0)
        log.info("[pond db] font activation backfill", { updated });
    } catch (err) {
      log.warn("[pond db] font activation backfill failed", err);
    }
  });

  const runVecBatch = (): void => {
    if (!sqlite.open || cachedPond?.$raw !== sqlite) return;
    try {
      const result = backfillVecBatch(sqlite);
      if (result.processed > 0) {
        log.info("[pond db] vec backfill batch", result);
      }
      if (result.hasMore) setImmediate(runVecBatch);
    } catch (err) {
      log.warn("[pond db] vec backfill failed", err);
    }
  };
  if (vectorEnabled) setImmediate(runVecBatch);

  if (runLibraryMigration) {
    setImmediate(() => {
      if (cachedPond?.$raw !== sqlite || !sqlite.open || !runLibraryMigration)
        return;
      void runLibraryMigration(cachedPond).catch((err) =>
        log.warn("[pond db] library scope migration failed", err),
      );
    });
  }
}

export function closeDb(): void {
  if (cachedPond) {
    try {
      cachedPond.$raw.close();
    } catch (err) {
      log.warn("[pond db] close failed", err);
    }
    cachedPond = null;
  }
  clearLibraryKey();
}

function ensureLibraryMetadata(): void {
  const paths = resolvePaths();
  if (!existsSync(paths.libraryRoot)) return;
  if (existsSync(paths.libraryMetadata)) return;
  readOrCreatePondId(paths.libraryRoot);
}

async function openSqliteWithKey(
  file: string,
  account: string,
): Promise<Database.Database> {
  const key = await ensureSecureSecretBytes(account, DATABASE_KEY_BYTES);
  try {
    return openSqlite(file, key);
  } finally {
    key.fill(0);
  }
}

async function openLegacyLibrarySqlite(
  file: string,
  pondId: string,
  roots: string[],
): Promise<Database.Database> {
  let legacyError: Error;
  try {
    return await openSqliteWithKey(
      file,
      `${KEYCHAIN_DATABASE_LIBRARY_PREFIX}:${pondId}`,
    );
  } catch (error) {
    legacyError =
      error instanceof Error ? error : new Error("The index could not open.");
  }

  try {
    await loadLibraryKeyFromSecureStorage(pondId, roots);
    const databaseKey = deriveLibrarySubkey("database:index");
    try {
      const sqlite = openSqlite(file, databaseKey);
      log.warn("[pond db] recovered index with the Library master key");
      return sqlite;
    } finally {
      databaseKey.fill(0);
    }
  } catch {
    clearLibraryKey();
    throw legacyError;
  }
}
