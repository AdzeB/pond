import { existsSync } from "node:fs";
import { join } from "node:path";
import { arch, platform } from "node:process";
import type Database from "better-sqlite3";
import log from "electron-log/main.js";
import { load as loadSqliteVecExtension } from "sqlite-vec";

export const TEXT_VEC_TABLE = "save_text_vec";
export const CLIP_VEC_TABLE = "save_clip_vec";
export const DEFAULT_TEXT_DIM = 384;
export const DEFAULT_CLIP_DIM = 512;

export type VecKind = "text" | "clip";

const TABLES: Record<VecKind, string> = {
  text: TEXT_VEC_TABLE,
  clip: CLIP_VEC_TABLE,
};

const DimRow = { dimensions: 0 as number };

export function toVecBlob(vector: ArrayLike<number>): Buffer {
  return Buffer.from(Float32Array.from(vector).buffer);
}

export function parseJsonVector(raw: unknown): number[] | null {
  if (Array.isArray(raw)) {
    const values = raw.filter(
      (value): value is number => typeof value === "number",
    );
    return values.length === raw.length ? values : null;
  }
  if (typeof raw !== "string" || !raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    return parseJsonVector(parsed);
  } catch {
    return null;
  }
}

export function loadSqliteVec(db: Database.Database): boolean {
  const unpacked = unpackedExtensionPath();
  if (unpacked) {
    try {
      db.loadExtension(unpacked);
      return true;
    } catch (error) {
      log.warn("[pond vec] unpacked extension failed", {
        error: error instanceof Error ? error.message : "unknown error",
      });
    }
  }
  try {
    loadSqliteVecExtension(db);
    return true;
  } catch (error) {
    log.warn("[pond vec] sqlite-vec unavailable", {
      error: error instanceof Error ? error.message : "unknown error",
    });
    return false;
  }
}

function unpackedExtensionPath(): string | null {
  const resourcesPath = process.resourcesPath;
  if (!resourcesPath) return null;
  const ext =
    platform === "darwin" ? "dylib" : platform === "win32" ? "dll" : "so";
  const os = platform === "win32" ? "windows" : platform;
  const candidate = join(
    resourcesPath,
    "app.asar.unpacked",
    "node_modules",
    `sqlite-vec-${os}-${arch}`,
    `vec0.${ext}`,
  );
  return existsSync(candidate) ? candidate : null;
}

export function ensureVecTables(
  db: Database.Database,
  dims: { text: number; clip: number } = {
    text: DEFAULT_TEXT_DIM,
    clip: DEFAULT_CLIP_DIM,
  },
): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS vec_meta (
      kind TEXT PRIMARY KEY,
      dimensions INTEGER NOT NULL
    );
  `);
  ensureKind(db, "text", dims.text);
  ensureKind(db, "clip", dims.clip);
}

export function ensureVecDim(
  db: Database.Database,
  kind: VecKind,
  dimensions: number,
): void {
  if (dimensions < 1) return;
  ensureKind(db, kind, dimensions);
}

function ensureKind(
  db: Database.Database,
  kind: VecKind,
  dimensions: number,
): void {
  const table = TABLES[kind];
  const row = db
    .prepare("SELECT dimensions FROM vec_meta WHERE kind = ?")
    .get(kind) as { dimensions: number } | undefined;
  if (row?.dimensions !== dimensions) {
    db.exec(`DROP TABLE IF EXISTS ${table}`);
  }
  db.exec(`
    CREATE VIRTUAL TABLE IF NOT EXISTS ${table} USING vec0(
      save_id TEXT PRIMARY KEY,
      embedding FLOAT[${dimensions}]
    );
  `);
  db.prepare(
    `INSERT INTO vec_meta(kind, dimensions) VALUES (?, ?)
     ON CONFLICT(kind) DO UPDATE SET dimensions = excluded.dimensions`,
  ).run(kind, dimensions);
}

export function currentVecDim(
  db: Database.Database,
  kind: VecKind,
): number | null {
  const row = db
    .prepare("SELECT dimensions FROM vec_meta WHERE kind = ?")
    .get(kind) as typeof DimRow | undefined;
  return row?.dimensions ?? null;
}

export function upsertVec(
  db: Database.Database,
  kind: VecKind,
  saveId: string,
  vector: ArrayLike<number>,
): boolean {
  if (!saveId || vector.length < 1) return false;
  ensureVecDim(db, kind, vector.length);
  const table = TABLES[kind];
  const blob = toVecBlob(vector);
  db.prepare(`DELETE FROM ${table} WHERE save_id = ?`).run(saveId);
  db.prepare(`INSERT INTO ${table}(save_id, embedding) VALUES (?, ?)`).run(
    saveId,
    blob,
  );
  return true;
}

export function deleteVec(db: Database.Database, saveId: string): void {
  if (!saveId) return;
  for (const table of Object.values(TABLES)) {
    try {
      db.prepare(`DELETE FROM ${table} WHERE save_id = ?`).run(saveId);
    } catch {
      /** Table may not exist yet. */
    }
  }
}

export function knnVec(
  db: Database.Database,
  kind: VecKind,
  vector: ArrayLike<number>,
  k: number,
): Array<{ id: string; distance: number }> {
  try {
    const dimensions = currentVecDim(db, kind);
    if (!dimensions || vector.length !== dimensions || k < 1) return [];
    const table = TABLES[kind];
    return db
      .prepare(
        `SELECT save_id AS id, distance FROM ${table} WHERE embedding MATCH ? AND k = ?`,
      )
      .all(toVecBlob(vector), k) as Array<{ id: string; distance: number }>;
  } catch (error) {
    log.warn("[pond vec] knn failed", {
      kind,
      error: error instanceof Error ? error.message : "unknown error",
    });
    return [];
  }
}

const BACKFILL_BATCH = 200;

export function backfillVecBatch(db: Database.Database): {
  processed: number;
  hasMore: boolean;
} {
  const textDim = currentVecDim(db, "text") ?? DEFAULT_TEXT_DIM;
  const clipDim = currentVecDim(db, "clip") ?? DEFAULT_CLIP_DIM;
  const textRows = db
    .prepare(
      `SELECT id, embedding FROM saves
       WHERE embedding IS NOT NULL
         AND id NOT IN (SELECT save_id FROM ${TEXT_VEC_TABLE})
       LIMIT ?`,
    )
    .all(BACKFILL_BATCH) as Array<{ id: string; embedding: string }>;
  const clipRows = db
    .prepare(
      `SELECT id, clip_embedding AS embedding FROM saves
       WHERE clip_embedding IS NOT NULL
         AND id NOT IN (SELECT save_id FROM ${CLIP_VEC_TABLE})
       LIMIT ?`,
    )
    .all(BACKFILL_BATCH) as Array<{ id: string; embedding: string }>;

  let processed = 0;
  for (const row of textRows) {
    const vector = parseJsonVector(row.embedding);
    if (
      vector &&
      vector.length === textDim &&
      upsertVec(db, "text", row.id, vector)
    ) {
      processed += 1;
    }
  }
  for (const row of clipRows) {
    const vector = parseJsonVector(row.embedding);
    if (
      vector &&
      vector.length === clipDim &&
      upsertVec(db, "clip", row.id, vector)
    ) {
      processed += 1;
    }
  }
  return {
    processed,
    hasMore:
      textRows.length === BACKFILL_BATCH || clipRows.length === BACKFILL_BATCH,
  };
}

export function ensureVecDeleteTrigger(db: Database.Database): void {
  db.exec(`
    DROP TRIGGER IF EXISTS saves_vec_ad;
    CREATE TRIGGER saves_vec_ad AFTER DELETE ON saves BEGIN
      DELETE FROM ${TEXT_VEC_TABLE} WHERE save_id = old.id;
      DELETE FROM ${CLIP_VEC_TABLE} WHERE save_id = old.id;
    END;
  `);
}
