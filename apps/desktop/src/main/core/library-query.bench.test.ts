import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { cpus, platform, release, tmpdir, totalmem } from "node:os";
import { join } from "node:path";
import * as schema from "@pond/schema/db";
import * as events from "@pond/schema/events";
import { EMPTY_QUERY } from "@pond/schema/filters";
import type { LibraryQueryRequest } from "@shared/library-query";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { expect, it } from "vitest";
import { initializePondSchema } from "../db";
import { queryLibraryPage } from "./library-query";

it.skipIf(process.env.POND_RUN_QUERY_BENCH !== "1")(
  "records real query-engine baselines at 1k, 10k and 100k",
  async () => {
    const root = await mkdtemp(join(tmpdir(), "pond-query-bench-"));
    const results: Array<{
      size: number;
      operation: string;
      p50: number;
      p95: number;
      samples: number;
      total: number;
    }> = [];
    try {
      for (const size of [1_000, 10_000, 100_000]) {
        const sqlite = new Database(join(root, `${size}.db`));
        try {
          initializePondSchema(sqlite, () => false);
          const db = Object.assign(
            drizzle(sqlite, { schema: { ...schema, ...events } }),
            { $raw: sqlite },
          );
          const insert = sqlite.prepare(
            "INSERT INTO saves(id,source,source_id,url,title,saved_at,created_at,status,media_type,rating,tags,file_size,width,height) VALUES (?, 'local', ?, 'pond:benchmark', ?, ?, ?, 'complete', ?, ?, ?, ?, ?, ?)",
          );
          const membership = sqlite.prepare(
            "INSERT INTO save_folders(save_id,folder_id) VALUES (?,'project')",
          );
          sqlite.exec(
            "INSERT INTO folders(id,name) VALUES ('project','Project')",
          );
          sqlite.transaction(() => {
            for (let i = 0; i < size; i++) {
              const id = String(i).padStart(7, "0");
              insert.run(
                id,
                id,
                `reference ${i % 5 === 0 ? "blue sky" : "design study"} ${i}`,
                i,
                i,
                ["image", "video", "audio", "document", "font"][i % 5],
                i % 6,
                JSON.stringify([`tag-${i % 100}`, "reference"]),
                i * 1024,
                1920,
                1080,
              );
              if (i % 20 === 0) membership.run(id);
            }
          })();
          const cases: Array<[string, LibraryQueryRequest]> = [
            [
              "folder",
              { query: EMPTY_QUERY, scope: { folderIds: ["project"] } },
            ],
            [
              "keyword",
              { query: EMPTY_QUERY, keywords: '"blue sky" -missing' },
            ],
            [
              "folder-keyword",
              {
                query: EMPTY_QUERY,
                keywords: "reference",
                scope: { folderIds: ["project"] },
              },
            ],
            [
              "file-size-sort",
              { query: EMPTY_QUERY, sortKey: "fileSize", sortDir: "asc" },
            ],
          ];
          for (const [operation, request] of cases) {
            await queryLibraryPage(db, "bench", { ...request, limit: 250 });
            const durations: number[] = [];
            let total = 0;
            for (let sample = 0; sample < 20; sample++) {
              const start = performance.now();
              const page = await queryLibraryPage(db, "bench", {
                ...request,
                limit: 250,
              });
              durations.push(performance.now() - start);
              total = page.total;
              expect(page.ids.length).toBeGreaterThan(0);
            }
            durations.sort((a, b) => a - b);
            results.push({
              size,
              operation,
              p50: durations[9] ?? 0,
              p95: durations[18] ?? 0,
              samples: 20,
              total,
            });
          }
        } finally {
          sqlite.close();
        }
      }
      const output = {
        date: new Date().toISOString(),
        kind: "query-engine-only",
        hardware: {
          cpu: cpus()[0]?.model,
          cores: cpus().length,
          memoryBytes: totalmem(),
          platform: platform(),
          release: release(),
          electron: process.versions.electron,
        },
        cache: "warm after one priming request",
        workload:
          "synthetic mixed-media metadata; no original decoding, IPC, renderer or debounce; uncontrolled host background workload",
        results,
      };
      const destination =
        process.env.POND_QUERY_BENCH_OUTPUT ||
        join(tmpdir(), "pond-query-baseline.json");
      await writeFile(destination, JSON.stringify(output, null, 2));
      console.log(`Query baseline written to ${destination}`);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  },
  180_000,
);
