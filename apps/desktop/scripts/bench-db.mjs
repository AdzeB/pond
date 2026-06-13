// Throwaway DB benchmark for Pond's per-pond SQLite index.
// Run with:  ELECTRON_RUN_AS_NODE=1 pnpm exec electron scripts/bench-db.mjs [scale...]
//
// It mirrors the REAL schema DDL + indexes (copied from src/main/db.ts) and the
// REAL `saves.list` query shape, then compares the current path (full table load
// into JS + in-memory filter) against pushing the same work into SQLite (the
// `buildWhere` path that exists but is not wired up) and FTS5 search.

import { createRequire } from "node:module";
import os from "node:os";
import { performance } from "node:perf_hooks";

const require = createRequire(import.meta.url);
const Database = require("better-sqlite3");

const SCALES = process.argv.slice(2).map(Number).filter(Boolean);
const ROW_COUNTS = SCALES.length ? SCALES : [1_000, 10_000, 50_000, 100_000];

// ---- Real schema (verbatim subset from src/main/db.ts) --------------------
const DDL = `
CREATE TABLE IF NOT EXISTS saves (
  id TEXT PRIMARY KEY, source TEXT NOT NULL, source_id TEXT NOT NULL, url TEXT NOT NULL,
  title TEXT, description TEXT, author TEXT, lang TEXT, site_name TEXT, published_at INTEGER,
  notes TEXT, media_url TEXT, media_type TEXT, raw_json TEXT, raw_slim TEXT,
  tags TEXT NOT NULL DEFAULT '[]', files TEXT NOT NULL DEFAULT '[]', cover_index INTEGER NOT NULL DEFAULT 0,
  width INTEGER, height INTEGER, file_size INTEGER, phash TEXT, sensitivity TEXT, sensitivity_model TEXT,
  video_notes TEXT NOT NULL DEFAULT '[]', dominant_colors TEXT NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'ingesting', ingest_started_at INTEGER, ingest_completed_at INTEGER,
  deleted_at INTEGER, saved_at INTEGER NOT NULL DEFAULT (unixepoch()*1000), created_at INTEGER NOT NULL DEFAULT (unixepoch()*1000),
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
  id TEXT PRIMARY KEY, save_id TEXT NOT NULL REFERENCES saves(id) ON DELETE CASCADE,
  op TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'pending', attempts INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 5, next_run_at INTEGER NOT NULL DEFAULT (unixepoch()*1000),
  last_error TEXT, payload TEXT, created_at INTEGER NOT NULL DEFAULT (unixepoch()*1000),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()*1000), UNIQUE(save_id, op)
);
CREATE INDEX IF NOT EXISTS tasks_save_idx ON tasks(save_id);

CREATE VIRTUAL TABLE IF NOT EXISTS saves_fts USING fts5(
  id UNINDEXED, title, description, author, tag_names, tokenize='porter unicode61'
);
CREATE TRIGGER IF NOT EXISTS saves_ai AFTER INSERT ON saves BEGIN
  INSERT INTO saves_fts(id,title,description,author,tag_names)
  VALUES(new.id,new.title,new.description,new.author,
    COALESCE(replace(replace(replace(new.tags,'[',''),']',''),'"',''),''));
END;
`;

// ---- Synthetic data -------------------------------------------------------
const SOURCES = [
  "twitter",
  "instagram",
  "pinterest",
  "tiktok",
  "youtube",
  "arena",
  "cosmos",
  "local",
];
const MEDIA = ["image", "video", "mixed", "link"];
const STATUS = [
  "complete",
  "complete",
  "complete",
  "complete",
  "ingesting",
  "failed",
]; // mostly complete
const TAG_POOL = Array.from({ length: 60 }, (_, i) => `tag${i}`);
const WORDS = (
  "design system architecture render motion gradient typography palette layout grid " +
  "interface product video photo essay film music archive reference inspiration mood study " +
  "color form structure pattern texture light shadow space depth balance rhythm contrast"
).split(" ");

function rnd(n) {
  return Math.floor(Math.random() * n);
}
function pick(a) {
  return a[rnd(a.length)];
}
function words(n) {
  const s = [];
  for (let i = 0; i < n; i++) s.push(pick(WORDS));
  return s.join(" ");
}
function tags() {
  const k = rnd(6);
  const set = new Set();
  for (let i = 0; i < k; i++) set.add(pick(TAG_POOL));
  return [...set];
}

// ~2-6 KB raw_json, mirroring a real capture payload that `saves.list` reads then discards.
function rawJson() {
  return JSON.stringify({
    capture: {
      media: Array.from({ length: 1 + rnd(4) }, () => ({
        type: pick(MEDIA),
        url: `https://example.com/${words(2).replace(/ /g, "-")}`,
        width: 400 + rnd(2000),
        height: 400 + rnd(2000),
        posterUrl: "https://example.com/p.jpg",
        alt: words(12),
      })),
      extras: {
        "og:title": words(8),
        "og:description": words(40),
        html: words(120),
      },
    },
    harvest: {
      fetchedAt: Date.now(),
      headers: { server: "nginx", "content-type": "text/html" },
      text: words(80),
    },
  });
}

function seed(db, n) {
  const now = Date.now();
  const insert = db.prepare(`INSERT INTO saves
    (id,source,source_id,url,title,description,author,media_type,raw_json,raw_slim,tags,files,width,height,file_size,status,saved_at,created_at)
    VALUES (@id,@source,@source_id,@url,@title,@description,@author,@media_type,@raw_json,@raw_slim,@tags,@files,@width,@height,@file_size,@status,@saved_at,@created_at)`);
  const insertTask = db.prepare(
    `INSERT INTO tasks (id,save_id,op,status) VALUES (?,?,?,?)`,
  );
  const tx = db.transaction((count) => {
    for (let i = 0; i < count; i++) {
      const id = `s${i.toString(36).padStart(8, "0")}`;
      const t = tags();
      const raw = rawJson();
      const parsed = JSON.parse(raw);
      // Mirror slimRawJson: keep only media/duration-ish bits.
      const slim = JSON.stringify({
        capture: {
          id: parsed.capture.id,
          source: parsed.capture.source,
          url: parsed.capture.url,
          media: parsed.capture.media.map((m) => ({
            url: m.url,
            type: m.type,
            durationSec: m.durationSec,
          })),
        },
      });
      insert.run({
        id,
        source: pick(SOURCES),
        source_id: `src${i}`,
        url: `https://x/${i}`,
        title: words(6),
        description: words(30),
        author: pick(WORDS),
        media_type: pick(MEDIA),
        raw_json: raw,
        raw_slim: slim,
        tags: JSON.stringify(t),
        files: JSON.stringify([
          {
            kind: "image",
            path: `${id}/cover.jpg`,
            sha256: "x",
            size: 1000 + rnd(5_000_000),
          },
        ]),
        width: 400 + rnd(2000),
        height: 400 + rnd(2000),
        file_size: 1000 + rnd(5_000_000),
        status: pick(STATUS),
        saved_at: now - rnd(1000) * 86_400_000,
        created_at: now,
      });
      // ~30% of saves carry a task row, like a partially-ingested library.
      if (i % 3 === 0) insertTask.run(`t${id}`, id, "finalize", "done");
    }
  });
  tx(n);
}

// ---- timing helper --------------------------------------------------------
function bench(label, fn, iters = 5) {
  for (let i = 0; i < 2; i++) fn(); // warmup
  const times = [];
  for (let i = 0; i < iters; i++) {
    const t0 = performance.now();
    const out = fn();
    times.push(performance.now() - t0);
    if (i === iters - 1) bench._last = out;
  }
  times.sort((a, b) => a - b);
  const median = times[Math.floor(times.length / 2)];
  return { label, median, min: times[0], max: times[times.length - 1] };
}

function fmt(ms) {
  return ms < 1 ? `${ms.toFixed(3)}ms` : `${ms.toFixed(1)}ms`;
}

// Mirror of match.ts semantics for the in-memory path (the current renderer cost).
function inMemoryFilter(rows, q) {
  return rows.filter(q);
}

function run(n) {
  const db = new Database(":memory:");
  db.pragma("journal_mode = WAL");
  db.pragma("synchronous = NORMAL");
  db.pragma("foreign_keys = ON");
  db.pragma("temp_store = MEMORY");
  db.pragma("mmap_size = 268435456");
  db.exec(DDL);

  const seedT0 = performance.now();
  seed(db, n);
  const seedMs = performance.now() - seedT0;

  const results = [];

  // --- A. The REAL saves.list default: SELECT * ORDER BY saved_at DESC (no limit) ---
  const selectAll = db.prepare(`SELECT * FROM saves ORDER BY saved_at DESC`);
  results.push(
    bench(
      "A. saves.list: SELECT * + JSON.parse all rows (current default)",
      () => {
        const rows = selectAll.all();
        // drizzle deserializes json columns; replicate the per-row parse cost.
        for (const r of rows) {
          r.tags = JSON.parse(r.tags);
          r.files = JSON.parse(r.files);
          r.raw_json = r.raw_json ? JSON.parse(r.raw_json) : null; // parsed, then slimmed away
        }
        return rows.length;
      },
    ),
  );

  // --- A2. Same, but DON'T select/parse raw_json (slim at SQL layer) ---
  const COLS =
    "id,source,source_id,url,title,description,author,media_type,tags,files,cover_index,width,height,file_size,status,sensitivity,saved_at,created_at";
  const selectSlim = db.prepare(
    `SELECT ${COLS} FROM saves ORDER BY saved_at DESC`,
  );
  results.push(
    bench("A2. saves.list slimmed at SQL (no raw_json column)", () => {
      const rows = selectSlim.all();
      for (const r of rows) {
        r.tags = JSON.parse(r.tags);
        r.files = JSON.parse(r.files);
      }
      return rows.length;
    }),
  );

  // --- A4. NEW saves.list: all columns + small raw_slim, never touches raw_json ---
  const selectNew = db.prepare(
    `SELECT ${COLS},raw_slim FROM saves ORDER BY saved_at DESC`,
  );
  results.push(
    bench("A4. NEW saves.list (cols + raw_slim, skips raw_json)", () => {
      const rows = selectNew.all();
      for (const r of rows) {
        r.tags = JSON.parse(r.tags);
        r.files = JSON.parse(r.files);
        r.raw_slim = r.raw_slim ? JSON.parse(r.raw_slim) : null;
      }
      return rows.length;
    }),
  );

  // --- A3. Slim at read time via json_extract: only the small subpaths cross into JS ---
  // slimRawJson needs: capture.{id,source,url,author.avatarUrl,duration},
  // capture.media[].{url,type,durationSec}, extractorId, extractedAt, ytdlp.duration.
  const selectExtract = db.prepare(`SELECT ${COLS},
      json_extract(raw_json,'$.capture.id') AS cap_id,
      json_extract(raw_json,'$.capture.source') AS cap_source,
      json_extract(raw_json,'$.capture.url') AS cap_url,
      json_extract(raw_json,'$.capture.author.avatarUrl') AS avatar,
      json_extract(raw_json,'$.capture.duration') AS cap_duration,
      json_extract(raw_json,'$.capture.media') AS media,
      json_extract(raw_json,'$.extractorId') AS extractor_id,
      json_extract(raw_json,'$.extractedAt') AS extracted_at,
      json_extract(raw_json,'$.ytdlp.duration') AS ytdlp_duration
    FROM saves ORDER BY saved_at DESC`);
  results.push(
    bench("A3. saves.list slim via json_extract (no migration)", () => {
      const rows = selectExtract.all();
      for (const r of rows) {
        r.tags = JSON.parse(r.tags);
        r.files = JSON.parse(r.files);
        r.media = r.media ? JSON.parse(r.media) : []; // only the small media array is parsed
      }
      return rows.length;
    }),
  );

  // --- B. tasks IN-query (second query saves.list runs) ---
  const allIds = db
    .prepare(`SELECT id FROM saves`)
    .all()
    .map((r) => r.id);
  // NOTE: the real loadTasksFor uses drizzle inArray(allIds); above ~32k ids that
  // throws "too many SQL variables". Chunk to stay correct (and to measure).
  const CHUNK = 20_000;
  results.push(
    bench(
      "B. loadTasksFor: tasks WHERE save_id IN (chunked 20k)",
      () => {
        let total = 0;
        for (let i = 0; i < allIds.length; i += CHUNK) {
          const slice = allIds.slice(i, i + CHUNK);
          const ph = slice.map(() => "?").join(",");
          total += db
            .prepare(`SELECT * FROM tasks WHERE save_id IN (${ph})`)
            .all(...slice).length;
        }
        return total;
      },
      3,
    ),
  );

  // Materialize the JS pool once (what the renderer holds in RAM after hydrate).
  const pool = selectSlim.all().map((r) => ({
    ...r,
    tags: JSON.parse(r.tags),
    files: JSON.parse(r.files),
  }));

  // --- C. Filter: source = 'twitter' ---
  results.push(
    bench(
      "C1. in-memory filter: source='twitter'",
      () => inMemoryFilter(pool, (s) => s.source === "twitter").length,
    ),
  );
  const qSource = db.prepare(
    `SELECT ${COLS} FROM saves WHERE source = ? ORDER BY saved_at DESC`,
  );
  results.push(
    bench("C2. SQL filter: source='twitter' (indexed)", () => {
      const rows = qSource.all("twitter");
      for (const r of rows) {
        r.tags = JSON.parse(r.tags);
        r.files = JSON.parse(r.files);
      }
      return rows.length;
    }),
  );

  // --- D. Filter: saved_at within last 90 days (range) ---
  const cutoff = Date.now() - 90 * 86_400_000;
  results.push(
    bench(
      "D1. in-memory filter: savedAt >= 90d",
      () => inMemoryFilter(pool, (s) => s.saved_at >= cutoff).length,
    ),
  );
  const qRange = db.prepare(
    `SELECT ${COLS} FROM saves WHERE saved_at >= ? ORDER BY saved_at DESC`,
  );
  results.push(
    bench("D2. SQL filter: savedAt >= 90d (indexed)", () => {
      const rows = qRange.all(cutoff);
      for (const r of rows) {
        r.tags = JSON.parse(r.tags);
        r.files = JSON.parse(r.files);
      }
      return rows.length;
    }),
  );

  // --- E. Tags: has tag 'tag1' (some) ---
  results.push(
    bench(
      "E1. in-memory filter: tags includes 'tag1'",
      () => inMemoryFilter(pool, (s) => s.tags.includes("tag1")).length,
    ),
  );
  const qTag = db.prepare(`SELECT ${COLS} FROM saves
    WHERE EXISTS (SELECT 1 FROM json_each(saves.tags) WHERE lower(value)='tag1') ORDER BY saved_at DESC`);
  results.push(
    bench("E2. SQL filter: tags some 'tag1' (json_each, no index)", () => {
      const rows = qTag.all();
      for (const r of rows) {
        r.tags = JSON.parse(r.tags);
        r.files = JSON.parse(r.files);
      }
      return rows.length;
    }),
  );

  // --- F. Text search: title/description contains a word ---
  const term = "design";
  results.push(
    bench(
      "F1. in-memory search: substring scan (current)",
      () =>
        pool.filter(
          (s) => s.title?.includes(term) || s.description?.includes(term),
        ).length,
    ),
  );
  const qFts =
    db.prepare(`SELECT s.${COLS.split(",").join(",s.")} FROM saves_fts f
    JOIN saves s ON s.id = f.id WHERE saves_fts MATCH ? ORDER BY s.saved_at DESC`);
  results.push(
    bench("F2. SQL search: FTS5 MATCH (index exists, unused today)", () => {
      const rows = qFts.all(term);
      return rows.length;
    }),
  );

  db.close();
  return { n, seedMs, results, poolSize: pool.length };
}

console.log(
  `\nPond DB benchmark — node ${process.versions.node} / electron ${process.versions.electron} / ${os.cpus()[0].model}\n`,
);

for (const n of ROW_COUNTS) {
  const { seedMs, results, poolSize } = run(n);
  console.log(
    `\n=== ${n.toLocaleString()} saves  (seed ${fmt(seedMs)}, pool ${poolSize}) ===`,
  );
  for (const r of results) {
    console.log(
      `  ${r.label.padEnd(58)} ${fmt(r.median).padStart(9)}  (min ${fmt(r.min)})`,
    );
  }
}
console.log("");
