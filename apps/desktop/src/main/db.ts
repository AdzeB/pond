import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import * as schema from "@pond/schema/db";
import * as eventsSchema from "@pond/schema/events";
import Database from "better-sqlite3";
import {
  type BetterSQLite3Database,
  drizzle,
} from "drizzle-orm/better-sqlite3";
import log from "electron-log/main.js";
import { readOrCreatePondId } from "./lib/pond-identity";
import { resolvePaths } from "./paths";

const combinedSchema = { ...schema, ...eventsSchema };

export type Db = BetterSQLite3Database<typeof combinedSchema> & {
  $raw: Database.Database;
};

// The pond index (saves, tags, tasks, scan, events) is per-pond and swaps
// on a library switch. The global DB (settings, prefs, onboarded) is shared
// by every pond and never swaps.
let cachedPond: Db | null = null;
let cachedGlobal: Db | null = null;

function openSqlite(file: string): Database.Database {
  const sqlite = new Database(file);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("synchronous = NORMAL");
  sqlite.pragma("foreign_keys = ON");
  sqlite.pragma("temp_store = MEMORY");
  sqlite.pragma("mmap_size = 268435456"); // 256 MiB
  return sqlite;
}

function wrap(sqlite: Database.Database): Db {
  const drizzled = drizzle(sqlite, { schema: combinedSchema });
  return Object.assign(drizzled, { $raw: sqlite }) as Db;
}

// App-global state: settings, prefs, onboarded flag. Lives in one file so a
// pond switch never loses it and the boot path (theme/onboarded) can read it
// before any pond is resolved.
export async function getGlobalDb(): Promise<Db> {
  ensureStorageMigrated();
  if (cachedGlobal) return cachedGlobal;
  const paths = resolvePaths();
  log.info("[pond db] opening global", paths.globalDb);
  const sqlite = openSqlite(paths.globalDb);
  migrateGlobal(sqlite);
  cachedGlobal = wrap(sqlite);
  return cachedGlobal;
}

// The active pond's index cache. Keyed by pond id, so switching ponds opens
// a different file and a fresh pond starts empty. `closeDb()` drops the
// handle on a switch so the next call reopens against the new pond.
export async function getDb(): Promise<Db> {
  ensureStorageMigrated();
  if (cachedPond) return cachedPond;

  const paths = resolvePaths();
  log.info("[pond db] opening pond index", paths.indexDb);

  const sqlite = openSqlite(paths.indexDb);
  migratePond(sqlite);
  cachedPond = wrap(sqlite);

  ensureLibraryMetadata();

  return cachedPond;
}

// Drop the active pond's handle so the next `getDb()` reopens against the
// pointer's new pond. Pair with `invalidatePaths()` on a library switch.
export function closeDb(): void {
  if (!cachedPond) return;
  try {
    cachedPond.$raw.close();
  } catch (err) {
    log.warn("[pond db] close failed", err);
  }
  cachedPond = null;
}

// One-time split of the legacy single `index.db`. The old file held both
// app-global settings AND pond rows for *every* library it ever opened (the
// index used to be shared). We seed only `global.db` from it so settings,
// prefs and the onboarded flag carry over. We deliberately do NOT seed the
// per-pond index: the bundle on disk is the source of truth, and
// `reconcileLibrary` rebuilds each pond's index from its own items. Copying
// the legacy rows would drag another pond's stale saves into whichever pond
// is active, which is exactly the bug this split fixes.
let migrated = false;
function ensureStorageMigrated(): void {
  if (migrated) return;
  migrated = true;
  const paths = resolvePaths();
  const legacy = join(paths.appData, "index.db");
  if (existsSync(paths.globalDb) || !existsSync(legacy)) return;
  try {
    // Flush the WAL into the main file so a plain copy captures recent writes.
    const flush = new Database(legacy);
    flush.pragma("wal_checkpoint(TRUNCATE)");
    flush.close();
  } catch (err) {
    log.warn("[pond db] legacy checkpoint failed", err);
  }
  try {
    mkdirSync(dirname(paths.globalDb), { recursive: true });
    copyFileSync(legacy, paths.globalDb);
    log.info("[pond db] seeded global.db from legacy index.db");
  } catch (err) {
    log.warn("[pond db] legacy migration failed", err);
  }
}

function migrateGlobal(sqlite: Database.Database): void {
  sqlite.exec(`
				CREATE TABLE IF NOT EXISTS settings (
					id TEXT PRIMARY KEY DEFAULT 'singleton',
					video_download TEXT NOT NULL DEFAULT '{"enabled":true,"maxHeight":1080,"maxFileSizeMb":500}',
					image_download TEXT,
					prefs TEXT,
					library_root TEXT,
					onboarded INTEGER NOT NULL DEFAULT 0,
					updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
				);
			`);
  // Forward-only adds for global DBs migrated from the legacy single index
  // that predate these columns.
  ensureColumns(sqlite, "settings", [
    { name: "image_download", ddl: "TEXT" },
    { name: "prefs", ddl: "TEXT" },
    { name: "library_root", ddl: "TEXT" },
    { name: "onboarded", ddl: "INTEGER NOT NULL DEFAULT 0" },
  ]);
}

function migratePond(sqlite: Database.Database): void {
  sqlite.exec(`
				CREATE TABLE IF NOT EXISTS saves (
					id TEXT PRIMARY KEY,
					source TEXT NOT NULL,
					source_id TEXT NOT NULL,
					url TEXT NOT NULL,
					title TEXT,
					description TEXT,
					author TEXT,
					lang TEXT,
					site_name TEXT,
					published_at INTEGER,
					notes TEXT,
					media_url TEXT,
					media_type TEXT,
					raw_json TEXT,
					tags TEXT NOT NULL DEFAULT '[]',
					files TEXT NOT NULL DEFAULT '[]',
					cover_index INTEGER NOT NULL DEFAULT 0,
					width INTEGER,
					height INTEGER,
					file_size INTEGER,
					deleted_at INTEGER,
					saved_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
					created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
					UNIQUE(source, source_id)
				);

				CREATE INDEX IF NOT EXISTS saves_saved_at_idx ON saves(saved_at);
				CREATE INDEX IF NOT EXISTS saves_source_idx ON saves(source);
				CREATE INDEX IF NOT EXISTS saves_size_idx ON saves(file_size);
				CREATE INDEX IF NOT EXISTS saves_dims_idx ON saves(width, height);
				CREATE INDEX IF NOT EXISTS saves_deleted_idx ON saves(deleted_at);

				CREATE TABLE IF NOT EXISTS tasks (
					id TEXT PRIMARY KEY,
					save_id TEXT NOT NULL REFERENCES saves(id) ON DELETE CASCADE,
					op TEXT NOT NULL,
					status TEXT NOT NULL DEFAULT 'pending',
					attempts INTEGER NOT NULL DEFAULT 0,
					max_attempts INTEGER NOT NULL DEFAULT 5,
					next_run_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
					last_error TEXT,
					payload TEXT,
					created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
					updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
					UNIQUE(save_id, op)
				);
				CREATE INDEX IF NOT EXISTS tasks_next_run_idx ON tasks(status, next_run_at);
				CREATE INDEX IF NOT EXISTS tasks_save_idx ON tasks(save_id);

				CREATE TABLE IF NOT EXISTS tags (
					id TEXT PRIMARY KEY,
					name TEXT NOT NULL UNIQUE,
					usage_count INTEGER NOT NULL DEFAULT 0,
					created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
				);

				CREATE TABLE IF NOT EXISTS tag_groups (
					id TEXT PRIMARY KEY,
					name TEXT NOT NULL UNIQUE,
					color TEXT,
					sort_order INTEGER NOT NULL DEFAULT 0,
					collapsed INTEGER NOT NULL DEFAULT 0,
					created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
				);

				CREATE TABLE IF NOT EXISTS tag_group_members (
					tag_id TEXT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
					group_id TEXT NOT NULL REFERENCES tag_groups(id) ON DELETE CASCADE,
					sort_order INTEGER NOT NULL DEFAULT 0,
					PRIMARY KEY (tag_id, group_id)
				);
				CREATE INDEX IF NOT EXISTS tag_group_members_tag_idx ON tag_group_members(tag_id);
				CREATE INDEX IF NOT EXISTS tag_group_members_group_idx ON tag_group_members(group_id);

				CREATE TABLE IF NOT EXISTS saved_views (
					id TEXT PRIMARY KEY,
					name TEXT NOT NULL,
					query TEXT NOT NULL DEFAULT '{"kind":"and","clauses":[]}',
					sort_key TEXT NOT NULL DEFAULT 'savedAt',
					sort_dir TEXT NOT NULL DEFAULT 'desc',
					layout TEXT,
					sort_order INTEGER NOT NULL DEFAULT 0,
					created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
				);

				CREATE TABLE IF NOT EXISTS sync_actions (
					id INTEGER PRIMARY KEY AUTOINCREMENT,
					batch_id TEXT,
					model_name TEXT NOT NULL,
					model_id TEXT NOT NULL,
					action TEXT NOT NULL,
					data TEXT,
					prev_data TEXT,
					actor TEXT NOT NULL,
					actor_reason TEXT,
					created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
				);
				CREATE INDEX IF NOT EXISTS sync_actions_model_idx ON sync_actions(model_name, model_id, id);
				CREATE INDEX IF NOT EXISTS sync_actions_actor_idx ON sync_actions(actor, id);
				CREATE INDEX IF NOT EXISTS sync_actions_batch_idx ON sync_actions(batch_id);

				CREATE TABLE IF NOT EXISTS library_scan (
					item_id TEXT PRIMARY KEY,
					mtime_ms INTEGER NOT NULL,
					scanned_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
				);

				CREATE TABLE IF NOT EXISTS pipeline_events (
					id INTEGER PRIMARY KEY AUTOINCREMENT,
					ts INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
					kind TEXT NOT NULL,
					save_id TEXT,
					source TEXT,
					op TEXT,
					outcome TEXT NOT NULL,
					duration_ms INTEGER,
					attempts INTEGER,
					error_name TEXT,
					error_message TEXT,
					trigger TEXT,
					payload TEXT NOT NULL
				);
				CREATE INDEX IF NOT EXISTS pipeline_events_ts_idx ON pipeline_events(ts);
				CREATE INDEX IF NOT EXISTS pipeline_events_save_idx ON pipeline_events(save_id, ts);
				CREATE INDEX IF NOT EXISTS pipeline_events_kind_outcome_idx ON pipeline_events(kind, outcome, ts);
				CREATE INDEX IF NOT EXISTS pipeline_events_source_op_idx ON pipeline_events(source, op);
			`);

  dropLegacyArtifacts(sqlite);
  // Table name comes from internal literals only, never user input.
  ensureColumns(sqlite, "saves", [
    { name: "status", ddl: "TEXT NOT NULL DEFAULT 'ingesting'" },
    { name: "ingest_started_at", ddl: "INTEGER" },
    { name: "ingest_completed_at", ddl: "INTEGER" },
    { name: "phash", ddl: "TEXT" },
    { name: "video_notes", ddl: "TEXT NOT NULL DEFAULT '[]'" },
    { name: "dominant_colors", ddl: "TEXT NOT NULL DEFAULT '[]'" },
    { name: "sensitivity", ddl: "TEXT" },
    { name: "sensitivity_model", ddl: "TEXT" },
  ]);
  sqlite.exec("CREATE INDEX IF NOT EXISTS saves_status_idx ON saves(status)");
  sqlite.exec(
    "CREATE INDEX IF NOT EXISTS saves_sensitivity_idx ON saves(sensitivity)",
  );
  ensureTagsLabelColumns(sqlite);
  dropArchivedAtColumn(sqlite);
  hardDeleteArticleSaves(sqlite);
  backfillCompleteStatusForExistingSaves(sqlite);

  sqlite.exec(`
				CREATE VIRTUAL TABLE IF NOT EXISTS saves_fts USING fts5(
					id UNINDEXED,
					title,
					description,
					author,
					tag_names,
					tokenize = 'porter unicode61'
				);

				CREATE TRIGGER IF NOT EXISTS saves_ai AFTER INSERT ON saves BEGIN
					INSERT INTO saves_fts(id, title, description, author, tag_names)
					VALUES (
						new.id, new.title, new.description, new.author,
						COALESCE(replace(replace(replace(new.tags, '[', ''), ']', ''), '"', ''), '')
					);
				END;

				CREATE TRIGGER IF NOT EXISTS saves_ad AFTER DELETE ON saves BEGIN
					DELETE FROM saves_fts WHERE id = old.id;
				END;

				CREATE TRIGGER IF NOT EXISTS saves_au AFTER UPDATE ON saves BEGIN
					DELETE FROM saves_fts WHERE id = old.id;
					INSERT INTO saves_fts(id, title, description, author, tag_names)
					VALUES (
						new.id, new.title, new.description, new.author,
						COALESCE(replace(replace(replace(new.tags, '[', ''), ']', ''), '"', ''), '')
					);
				END;
			`);
}

interface ColumnSpec {
  name: string;
  ddl: string;
}

// Forward-only column adds. Each spec is applied only when the column is
// absent, so this is idempotent across boots. Table and DDL come from
// internal string literals, never user input.
function ensureColumns(
  sqlite: Database.Database,
  table: string,
  specs: ColumnSpec[],
): void {
  const have = new Set(
    (
      sqlite
        .prepare<unknown[], { name: string }>(`PRAGMA table_info(${table})`)
        .all() as { name: string }[]
    ).map((c) => c.name),
  );
  for (const spec of specs) {
    if (!have.has(spec.name)) {
      sqlite.exec(`ALTER TABLE ${table} ADD COLUMN ${spec.name} ${spec.ddl}`);
    }
  }
}

function ensureTagsLabelColumns(sqlite: Database.Database): void {
  const cols = sqlite
    .prepare<unknown[], { name: string }>("PRAGMA table_info(tags)")
    .all() as { name: string }[];
  const have = new Set(cols.map((c) => c.name));
  if (have.has("description")) {
    try {
      sqlite.exec('ALTER TABLE tags DROP COLUMN "description";');
    } catch (err) {
      log.warn("[pond db] failed to drop legacy tags.description column", err);
    }
  }
  if (!have.has("starred")) {
    sqlite.exec(
      "ALTER TABLE tags ADD COLUMN starred INTEGER NOT NULL DEFAULT 0",
    );
  }
  if (!have.has("last_used_at")) {
    sqlite.exec("ALTER TABLE tags ADD COLUMN last_used_at INTEGER");
  }
  if (have.has("group")) {
    migrateLegacyTagGroupColumn(sqlite);
  }
  if (have.has("color")) {
    try {
      sqlite.exec('ALTER TABLE tags DROP COLUMN "color";');
    } catch (err) {
      log.warn("[pond db] failed to drop legacy tags.color column", err);
    }
  }
}

// Backfill `tag_groups` + `tag_group_members` from the legacy single-string
// `tags.group` column, then drop the column. Idempotent: safe to run on a
// DB that already has tag_groups rows (the upserts won't duplicate names).
function migrateLegacyTagGroupColumn(sqlite: Database.Database): void {
  try {
    const rows = sqlite
      .prepare<unknown[], { id: string; group: string | null }>(
        'SELECT id, "group" FROM tags WHERE "group" IS NOT NULL AND TRIM("group") != \'\'',
      )
      .all() as Array<{ id: string; group: string | null }>;

    const tx = sqlite.transaction((items: typeof rows) => {
      const insertGroup = sqlite.prepare(
        "INSERT OR IGNORE INTO tag_groups (id, name) VALUES (?, ?)",
      );
      const findGroup = sqlite.prepare(
        "SELECT id FROM tag_groups WHERE name = ?",
      );
      const insertMember = sqlite.prepare(
        "INSERT OR IGNORE INTO tag_group_members (tag_id, group_id) VALUES (?, ?)",
      );
      for (const row of items) {
        const groupName = row.group?.trim();
        if (!groupName) continue;
        const groupId = cryptoRandomId();
        insertGroup.run(groupId, groupName);
        const resolved = findGroup.get(groupName) as { id: string } | undefined;
        if (!resolved) continue;
        insertMember.run(row.id, resolved.id);
      }
    });
    tx(rows);

    sqlite.exec(
      'DROP INDEX IF EXISTS tags_group_idx; ALTER TABLE tags DROP COLUMN "group";',
    );
    log.info(
      `[pond db] migration: moved ${rows.length} tag/group memberships into tag_group_members`,
    );
  } catch (err) {
    log.warn("[pond db] legacy tag group migration failed", err);
  }
}

// hardDeleteArticleSaves: the article source has been removed from the
// URL-first pipeline. Any legacy rows tagged `article` are unreachable
// from the new code path; drop them so the renderer never has to render
// an unknown source.
function hardDeleteArticleSaves(sqlite: Database.Database): void {
  try {
    const info = sqlite
      .prepare("DELETE FROM saves WHERE source = 'article'")
      .run();
    if (info.changes > 0) {
      log.info(
        `[pond db] migration: hard-deleted ${info.changes} article saves`,
      );
    }
  } catch (err) {
    log.warn("[pond db] article cleanup failed", err);
  }
}

// backfillCompleteStatusForExistingSaves: saves created before the
// status column existed default to `ingesting`. If they already have at
// least one file on disk we know ingest finished long ago, so mark them
// `complete` and stamp ingestCompletedAt to silence the in-progress UI.
function backfillCompleteStatusForExistingSaves(
  sqlite: Database.Database,
): void {
  try {
    const info = sqlite
      .prepare(
        `UPDATE saves
         SET status = 'complete',
             ingest_completed_at = COALESCE(ingest_completed_at, saved_at)
         WHERE status = 'ingesting'
           AND files IS NOT NULL
           AND files != '[]'
           AND id NOT IN (SELECT save_id FROM tasks)`,
      )
      .run();
    if (info.changes > 0) {
      log.info(
        `[pond db] migration: marked ${info.changes} legacy saves as complete`,
      );
    }
  } catch (err) {
    log.warn("[pond db] complete-status backfill failed", err);
  }
}

function dropLegacyArtifacts(sqlite: Database.Database): void {
  try {
    sqlite.exec(`
			DROP TABLE IF EXISTS enrich_jobs;
			DROP TABLE IF EXISTS saves_vec;
			DROP TABLE IF EXISTS pond_meta;
			DROP TRIGGER IF EXISTS saves_ai;
			DROP TRIGGER IF EXISTS saves_ad;
			DROP TRIGGER IF EXISTS saves_au;
			DROP TABLE IF EXISTS saves_fts;
			`);
  } catch (err) {
    log.warn("[pond db] legacy artifact drop failed", err);
  }
}

// The archive concept is gone. Trash is the only soft-delete state.
// Drop the column from existing databases. SQLite 3.35+ supports
// `ALTER TABLE … DROP COLUMN`, which is what better-sqlite3 ships with.
function dropArchivedAtColumn(sqlite: Database.Database): void {
  try {
    const cols = sqlite
      .prepare<unknown[], { name: string }>("PRAGMA table_info(saves)")
      .all() as { name: string }[];
    const have = new Set(cols.map((c) => c.name));
    if (!have.has("archived_at")) return;
    sqlite.exec(`
			DROP INDEX IF EXISTS saves_archived_idx;
			ALTER TABLE saves DROP COLUMN archived_at;
		`);
    log.info("[pond db] migration: dropped archived_at column");
  } catch (err) {
    log.warn("[pond db] archived_at drop failed", err);
  }
}

function ensureLibraryMetadata(): void {
  const paths = resolvePaths();
  // No bundle on disk yet (fresh user): don't create one from here. The
  // first write materializes the bundle, and `resolvePondId` writes its
  // metadata. This keeps the index key (pond id) and the metadata file in
  // sync via a single writer.
  if (!existsSync(paths.libraryRoot)) return;
  if (existsSync(paths.libraryMetadata)) return;
  readOrCreatePondId(paths.libraryRoot);
}

function cryptoRandomId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}
