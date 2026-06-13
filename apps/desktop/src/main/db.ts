import { existsSync } from "node:fs";
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
					phash TEXT,
					sensitivity TEXT,
					sensitivity_model TEXT,
					video_notes TEXT NOT NULL DEFAULT '[]',
					dominant_colors TEXT NOT NULL DEFAULT '[]',
					status TEXT NOT NULL DEFAULT 'ingesting',
					ingest_started_at INTEGER,
					ingest_completed_at INTEGER,
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
				CREATE INDEX IF NOT EXISTS saves_status_idx ON saves(status);
				CREATE INDEX IF NOT EXISTS saves_sensitivity_idx ON saves(sensitivity);

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
					starred INTEGER NOT NULL DEFAULT 0,
					last_used_at INTEGER,
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
