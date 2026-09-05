import { existsSync } from "node:fs";
import * as schema from "@pond/schema/db";
import * as eventsSchema from "@pond/schema/events";
import Database from "better-sqlite3";
import {
  type BetterSQLite3Database,
  drizzle,
} from "drizzle-orm/better-sqlite3";
import log from "electron-log/main.js";
import { z } from "zod";
import {
  backfillVecBatch,
  ensureVecDeleteTrigger,
  ensureVecTables,
  loadSqliteVec,
} from "./core/vec-index";
import { readOrCreatePondId } from "./lib/pond-identity";
import { backfillRawSlimBatch } from "./lib/raw-slim";
import { resolvePaths } from "./paths";

const combinedSchema = { ...schema, ...eventsSchema };

export type Db = BetterSQLite3Database<typeof combinedSchema> & {
  $raw: Database.Database;
};

let cachedPond: Db | null = null;
let cachedGlobal: Db | null = null;
let pondDbInflight: Promise<Db> | null = null;

function openSqlite(file: string): Database.Database {
  const sqlite = new Database(file);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("synchronous = NORMAL");
  sqlite.pragma("foreign_keys = ON");
  sqlite.pragma("temp_store = MEMORY");
  sqlite.pragma("mmap_size = 268435456");
  sqlite.pragma("busy_timeout = 5000");
  sqlite.pragma("cache_size = -65536");
  sqlite.pragma("wal_autocheckpoint = 2000");
  return sqlite;
}

const TableInfoSchema = z.array(z.object({ name: z.string() }));
const CountRowSchema = z.object({ n: z.number() });

function wrap(sqlite: Database.Database): Db {
  const drizzled = drizzle(sqlite, { schema: combinedSchema });
  return Object.assign(drizzled, { $raw: sqlite });
}

export async function getGlobalDb(): Promise<Db> {
  if (cachedGlobal) return cachedGlobal;
  const paths = resolvePaths();
  log.info("[pond db] opening global", paths.globalDb);
  const sqlite = openSqlite(paths.globalDb);
  migrateGlobal(sqlite);
  cachedGlobal = wrap(sqlite);
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

  const sqlite = openSqlite(paths.indexDb);
  const vectorEnabled = initializePondSchema(sqlite);
  cachedPond = wrap(sqlite);

  ensureLibraryMetadata();

  scheduleDataMigrations(sqlite, vectorEnabled);

  return cachedPond;
}

export function initializePondSchema(
  sqlite: Database.Database,
  loadVectorExtension = loadSqliteVec,
): boolean {
  const vectorEnabled = loadVectorExtension(sqlite);
  if (vectorEnabled) ensureVecTables(sqlite);
  migratePond(sqlite);
  if (vectorEnabled) ensureVecDeleteTrigger(sqlite);
  return vectorEnabled;
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

  setImmediate(() => {
    void import("./core/library-scope-migration")
      .then(({ runLibraryScopeMigration }) => {
        if (cachedPond?.$raw !== sqlite || !sqlite.open) return;
        return runLibraryScopeMigration(cachedPond);
      })
      .catch((err) =>
        log.warn("[pond db] library scope migration failed", err),
      );
  });
}

export function closeDb(): void {
  if (!cachedPond) return;
  try {
    cachedPond.$raw.close();
  } catch (err) {
    log.warn("[pond db] close failed", err);
  }
  cachedPond = null;
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
}

function migratePond(sqlite: Database.Database): void {
  sqlite.exec(`
				CREATE TABLE IF NOT EXISTS saves (
					id TEXT PRIMARY KEY,
					source TEXT NOT NULL,
					source_id TEXT NOT NULL,
					account_id TEXT,
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
					raw_slim TEXT,
					tags TEXT NOT NULL DEFAULT '[]',
					list_kinds TEXT NOT NULL DEFAULT '[]',
					files TEXT NOT NULL DEFAULT '[]',
					cover_index INTEGER NOT NULL DEFAULT 0,
					width INTEGER,
					height INTEGER,
					file_size INTEGER,
					phash TEXT,
					blurhash TEXT,
					embedding TEXT,
					embedding_model TEXT,
					caption TEXT,
					caption_model TEXT,
					ocr_text TEXT,
					ocr_model TEXT,
					transcript TEXT,
					transcript_model TEXT,
					clip_embedding TEXT,
					clip_model TEXT,
					aesthetic TEXT,
					aesthetic_model TEXT,
					auto_title_model TEXT,
					suggested_tags TEXT,
					suggested_tags_model TEXT,
					video_notes TEXT NOT NULL DEFAULT '[]',
					comments TEXT NOT NULL DEFAULT '[]',
					rating INTEGER,
					rotate INTEGER NOT NULL DEFAULT 0,
					flip_x INTEGER NOT NULL DEFAULT 0,
					flip_y INTEGER NOT NULL DEFAULT 0,
					crop TEXT,
					dominant_colors TEXT NOT NULL DEFAULT '[]',
					status TEXT NOT NULL DEFAULT 'ingesting',
					ingest_started_at INTEGER,
					ingest_completed_at INTEGER,
					deleted_at INTEGER,
					saved_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
					created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
					UNIQUE(source, source_id)
				);

				CREATE INDEX IF NOT EXISTS saves_saved_at_id_idx
					ON saves(saved_at DESC, id DESC);
				DROP INDEX IF EXISTS saves_saved_at_idx;
				CREATE INDEX IF NOT EXISTS saves_source_idx ON saves(source);
				CREATE INDEX IF NOT EXISTS saves_size_idx ON saves(file_size);
				CREATE INDEX IF NOT EXISTS saves_dims_idx ON saves(width, height);
				CREATE INDEX IF NOT EXISTS saves_deleted_idx ON saves(deleted_at);
				CREATE INDEX IF NOT EXISTS saves_status_idx ON saves(status);

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
					description TEXT,
					starred INTEGER NOT NULL DEFAULT 0,
					archived INTEGER NOT NULL DEFAULT 0,
					last_used_at INTEGER,
					usage_count INTEGER NOT NULL DEFAULT 0,
					created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
				);
				-- Case-insensitive name lookups (rename/merge collision checks).
				CREATE INDEX IF NOT EXISTS tags_name_lower_idx ON tags(lower(name));

				CREATE TABLE IF NOT EXISTS tag_groups (
					id TEXT PRIMARY KEY,
					name TEXT NOT NULL UNIQUE,
					description TEXT,
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

				CREATE TABLE IF NOT EXISTS folders (
					id TEXT PRIMARY KEY,
					parent_id TEXT,
					name TEXT NOT NULL,
					color TEXT,
					sort_order INTEGER NOT NULL DEFAULT 0,
					created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
				);
				CREATE INDEX IF NOT EXISTS folders_parent_idx ON folders(parent_id, sort_order);

				CREATE TABLE IF NOT EXISTS save_folders (
					save_id TEXT NOT NULL REFERENCES saves(id) ON DELETE CASCADE,
					folder_id TEXT NOT NULL REFERENCES folders(id) ON DELETE CASCADE,
					PRIMARY KEY (save_id, folder_id)
				);
				CREATE INDEX IF NOT EXISTS save_folders_save_idx ON save_folders(save_id);
				CREATE INDEX IF NOT EXISTS save_folders_folder_idx ON save_folders(folder_id);

				CREATE TABLE IF NOT EXISTS agent_chats (
					id TEXT PRIMARY KEY,
					title TEXT,
					created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
					updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
				);

				CREATE TABLE IF NOT EXISTS agent_messages (
					id TEXT PRIMARY KEY,
					chat_id TEXT NOT NULL REFERENCES agent_chats(id) ON DELETE CASCADE,
					role TEXT NOT NULL,
					content TEXT NOT NULL,
					created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
				);
				CREATE INDEX IF NOT EXISTS agent_messages_chat_idx ON agent_messages(chat_id, created_at);

				CREATE TABLE IF NOT EXISTS saved_views (
					id TEXT PRIMARY KEY,
					name TEXT NOT NULL,
					question TEXT,
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
					account_id TEXT,
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
				CREATE INDEX IF NOT EXISTS pipeline_events_kind_ts_idx ON pipeline_events(kind, ts);
				CREATE INDEX IF NOT EXISTS pipeline_events_source_op_idx ON pipeline_events(source, op);
			`);

  addColumnIfMissing(sqlite, "saved_views", "question", "TEXT");
  addColumnIfMissing(sqlite, "agent_messages", "metadata", "TEXT");
  addColumnIfMissing(sqlite, "tags", "archived", "INTEGER NOT NULL DEFAULT 0");
  addColumnIfMissing(sqlite, "tags", "description", "TEXT");
  addColumnIfMissing(sqlite, "tag_groups", "description", "TEXT");
  dropColumnIfPresent(sqlite, "tags", "color");
  addColumnIfMissing(sqlite, "saves", "raw_slim", "TEXT");
  addColumnIfMissing(
    sqlite,
    "saves",
    "list_kinds",
    "TEXT NOT NULL DEFAULT '[]'",
  );
  addColumnIfMissing(sqlite, "saves", "embedding", "TEXT");
  addColumnIfMissing(sqlite, "saves", "embedding_model", "TEXT");
  addColumnIfMissing(sqlite, "saves", "caption", "TEXT");
  addColumnIfMissing(sqlite, "saves", "caption_model", "TEXT");
  addColumnIfMissing(sqlite, "saves", "ocr_text", "TEXT");
  addColumnIfMissing(sqlite, "saves", "ocr_model", "TEXT");
  addColumnIfMissing(sqlite, "saves", "transcript", "TEXT");
  addColumnIfMissing(sqlite, "saves", "transcript_model", "TEXT");
  addColumnIfMissing(sqlite, "saves", "clip_embedding", "TEXT");
  addColumnIfMissing(sqlite, "saves", "clip_model", "TEXT");
  addColumnIfMissing(sqlite, "saves", "aesthetic", "TEXT");
  addColumnIfMissing(sqlite, "saves", "aesthetic_model", "TEXT");
  addColumnIfMissing(sqlite, "saves", "auto_title_model", "TEXT");
  addColumnIfMissing(sqlite, "saves", "suggested_tags", "TEXT");
  addColumnIfMissing(sqlite, "saves", "suggested_tags_model", "TEXT");
  addColumnIfMissing(sqlite, "saves", "account_id", "TEXT");
  addColumnIfMissing(sqlite, "saves", "blurhash", "TEXT");
  addColumnIfMissing(sqlite, "saves", "comments", "TEXT NOT NULL DEFAULT '[]'");
  addColumnIfMissing(sqlite, "saves", "rating", "INTEGER");
  addColumnIfMissing(sqlite, "saves", "rotate", "INTEGER NOT NULL DEFAULT 0");
  addColumnIfMissing(sqlite, "saves", "flip_x", "INTEGER NOT NULL DEFAULT 0");
  addColumnIfMissing(sqlite, "saves", "flip_y", "INTEGER NOT NULL DEFAULT 0");
  addColumnIfMissing(sqlite, "saves", "crop", "TEXT");
  addColumnIfMissing(sqlite, "pipeline_events", "account_id", "TEXT");
  sqlite.exec(
    "CREATE INDEX IF NOT EXISTS saves_account_idx ON saves(account_id);",
  );

  sqlite.exec(`
				CREATE INDEX IF NOT EXISTS saves_has_embedding_idx
					ON saves(id) WHERE embedding IS NOT NULL;
				CREATE INDEX IF NOT EXISTS saves_has_clip_embedding_idx
					ON saves(id) WHERE clip_embedding IS NOT NULL;
			`);

  ensureSavesFts(sqlite);
}

const SAVES_FTS_COLUMNS = [
  "id",
  "title",
  "description",
  "author",
  "tag_names",
  "caption",
  "ocr_text",
  "transcript",
  "notes",
  "url",
] as const;

function ensureSavesFts(sqlite: Database.Database): void {
  const existing = TableInfoSchema.parse(
    sqlite.prepare("PRAGMA table_info(saves_fts)").all(),
  ).map((c) => c.name);
  const hasAll = SAVES_FTS_COLUMNS.every((c) => existing.includes(c));
  if (existing.length > 0 && !hasAll) {
    sqlite.exec(`
				DROP TRIGGER IF EXISTS saves_ai;
				DROP TRIGGER IF EXISTS saves_ad;
				DROP TRIGGER IF EXISTS saves_au;
				DROP TABLE IF EXISTS saves_fts;
			`);
  }

  sqlite.exec("DROP TRIGGER IF EXISTS saves_au;");

  sqlite.exec(`
				CREATE VIRTUAL TABLE IF NOT EXISTS saves_fts USING fts5(
					id UNINDEXED,
					title,
					description,
					author,
					tag_names,
					caption,
					ocr_text,
					transcript,
					notes,
					url,
					tokenize = 'porter unicode61'
				);

				CREATE TRIGGER IF NOT EXISTS saves_ai AFTER INSERT ON saves BEGIN
					INSERT INTO saves_fts(id, title, description, author, tag_names, caption, ocr_text, transcript, notes, url)
					VALUES (
						new.id, new.title, new.description, new.author,
						COALESCE(replace(replace(replace(new.tags, '[', ''), ']', ''), '"', ''), ''),
						new.caption, new.ocr_text, new.transcript, new.notes, new.url
					);
				END;

				CREATE TRIGGER IF NOT EXISTS saves_ad AFTER DELETE ON saves BEGIN
					DELETE FROM saves_fts WHERE id = old.id;
				END;

				CREATE TRIGGER IF NOT EXISTS saves_au
				AFTER UPDATE OF title, description, author, tags, caption, ocr_text, transcript, notes, url
				ON saves BEGIN
					DELETE FROM saves_fts WHERE id = old.id;
					INSERT INTO saves_fts(id, title, description, author, tag_names, caption, ocr_text, transcript, notes, url)
					VALUES (
						new.id, new.title, new.description, new.author,
						COALESCE(replace(replace(replace(new.tags, '[', ''), ']', ''), '"', ''), ''),
						new.caption, new.ocr_text, new.transcript, new.notes, new.url
					);
				END;
			`);

  const count = CountRowSchema.parse(
    sqlite.prepare("SELECT COUNT(*) AS n FROM saves_fts").get(),
  );
  if (count.n === 0) {
    sqlite.exec(`
					INSERT INTO saves_fts(id, title, description, author, tag_names, caption, ocr_text, transcript, notes, url)
					SELECT
						id, title, description, author,
						COALESCE(replace(replace(replace(tags, '[', ''), ']', ''), '"', ''), ''),
						caption, ocr_text, transcript, notes, url
					FROM saves;
				`);
  }
}

function addColumnIfMissing(
  sqlite: Database.Database,
  table: string,
  column: string,
  type: string,
): void {
  const cols = TableInfoSchema.parse(
    sqlite.prepare(`PRAGMA table_info(${table})`).all(),
  );
  if (cols.some((c) => c.name === column)) return;
  sqlite.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`);
}

function dropColumnIfPresent(
  sqlite: Database.Database,
  table: string,
  column: string,
): void {
  const cols = TableInfoSchema.parse(
    sqlite.prepare(`PRAGMA table_info(${table})`).all(),
  );
  if (!cols.some((c) => c.name === column)) return;
  sqlite.exec(`ALTER TABLE ${table} DROP COLUMN ${column}`);
}

function ensureLibraryMetadata(): void {
  const paths = resolvePaths();
  if (!existsSync(paths.libraryRoot)) return;
  if (existsSync(paths.libraryMetadata)) return;
  readOrCreatePondId(paths.libraryRoot);
}
