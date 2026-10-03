import { existsSync } from "node:fs";
import type Database from "better-sqlite3";
import log from "electron-log/main.js";
import {
  KEYCHAIN_DATABASE_GLOBAL,
  KEYCHAIN_DATABASE_LIBRARY_PREFIX,
} from "../../shared/constants";
import { recoverBatchJournal } from "../core/batch-journal";
import { backfillFontActivationIndex } from "../core/font-activation";
import { prepareLegacyLibraryRead } from "../core/legacy-encryption/library-access";
import {
  clearLibraryKey,
  deriveLibrarySubkey,
  libraryKeyInstalled,
  loadLibraryKeyFromSecureStorage,
} from "../core/legacy-encryption/library-key-runtime";
import { hydrateOrganizationBundle } from "../core/organization-bundle";
import { backfillVecBatch } from "../core/vec-index";
import { getSecureSecretBytes } from "../keychain";
import { readOrCreatePondId } from "../lib/pond-identity";
import { backfillRawSlimBatch } from "../lib/raw-slim";
import { resolvePaths } from "../paths";
import { type Db, openSqlite, wrapSqlite } from "./client";
import { migrateGlobal } from "./migrations";
import { convertLegacyDatabaseWithKeyCandidates } from "./plaintext-sqlite";
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
  await prepareLegacyLibraryRead();
  const sqlite = await openLegacyLibrarySqlite(paths.indexDb, pondId, [
    paths.libraryRoot,
    paths.thumbnailCache,
  ]);
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
  const backup = await convertLegacyDatabaseWithKeyCandidates(file, [
    async () => {
      const key = await getSecureSecretBytes(account, 32);
      if (!key)
        throw new Error(
          "The existing database key is unavailable. No files were changed.",
        );
      return key;
    },
  ]);
  if (backup) log.info("[pond db] converted legacy database", { file, backup });
  return openSqlite(file);
}

async function openLegacyLibrarySqlite(
  file: string,
  pondId: string,
  roots: string[],
): Promise<Database.Database> {
  try {
    const backup = await convertLegacyDatabaseWithKeyCandidates(file, [
      async () => {
        const key = await getSecureSecretBytes(
          `${KEYCHAIN_DATABASE_LIBRARY_PREFIX}:${pondId}`,
          32,
        );
        if (!key)
          throw new Error(
            "The existing database key is unavailable. No files were changed.",
          );
        return key;
      },
      async () => {
        if (!libraryKeyInstalled(pondId))
          await loadLibraryKeyFromSecureStorage(pondId, roots);
        return deriveLibrarySubkey("database:index");
      },
    ]);
    if (backup)
      log.info("[pond db] converted legacy database", { file, backup });
    return openSqlite(file);
  } catch (error) {
    clearLibraryKey();
    throw error;
  }
}
