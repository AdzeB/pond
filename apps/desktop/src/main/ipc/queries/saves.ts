import { saves, type Task, tasks } from "@pond/schema/db";
import { buildWhere, isEmptyQuery } from "@pond/schema/filters";
import { durationProjection } from "@pond/schema/filters/fields";
import type { RawJson } from "@pond/schema/raw";
import type { Transaction } from "@pond/schema/tx";
import {
  and,
  asc,
  count,
  desc,
  eq,
  getTableColumns,
  inArray,
  isNotNull,
  isNull,
  type SQL,
  type SQLWrapper,
  sql,
} from "drizzle-orm";
import { clipboard, nativeImage } from "electron";
import log from "electron-log/main.js";
import { z } from "zod";
import { executeBatch } from "../../core/executor";
import { extractFontFamily, renameWithFamily } from "../../core/font-metadata";
import { libraryRetrievalInput } from "../../core/library-retrieval";
import { persistSave } from "../../core/persist-save";
import { retryFailedSaves } from "../../core/pipeline/enqueue";
import { runRenderTextCover } from "../../core/pipeline/workers/render-text-cover";
import { recordForUndo } from "../../core/undo";
import { parseJsonVector, upsertVec } from "../../core/vec-index";
import type { Db } from "../../db";
import { getDb } from "../../db";
import { itemFile } from "../../paths";
import { resolveSaveFilePath } from "../helpers";
import { type SaveListRow, toWireSaves } from "../wire";
import {
  FileIndexParam,
  FlagParam,
  NullableStringParam,
  OptionalNumberParam,
  type QueryHandlerMap,
  QueryParam,
  query,
  StringListParam,
  StringParam,
} from "./params";
import { savesExportQueries } from "./saves-export";
import { savesImportQueries } from "./saves-import";
import { cursorFor } from "./saves-page";

function isHttpUrl(u: string | undefined | null): u is string {
  if (!u) return false;
  return u.startsWith("http://") || u.startsWith("https://");
}

function writeFileRefsToClipboard(paths: string[]): void {
  if (paths.length === 0) return;
  if (process.platform !== "darwin") {
    clipboard.writeText(paths.join("\n"));
    return;
  }
  if (paths.length === 1) {
    const path = paths[0];
    if (!path) return;
    const url = `file://${encodeURI(path)}`;
    clipboard.writeBuffer("public.file-url", Buffer.from(url, "utf8"));
    return;
  }
  clipboard.writeBuffer(
    "NSFilenamesPboardType",
    Buffer.from(filenamesPlist(paths), "utf8"),
  );
}

function filenamesPlist(paths: string[]): string {
  const items = paths.map((p) => `<string>${escapeXml(p)}</string>`).join("");
  return `<?xml version="1.0" encoding="UTF-8"?><!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd"><plist version="1.0"><array>${items}</array></plist>`;
}

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

const OpenGraphImageSchema = z.object({ "og:image": z.string() });

function derivePublicImageUrl(raw: RawJson | null): string | null {
  if (!raw) return null;
  const media = raw.capture?.media ?? [];
  const image = media.find((m) => m.type === "image" && isHttpUrl(m.url));
  if (image) return image.url;
  const video = media.find((m) => m.type === "video" && isHttpUrl(m.posterUrl));
  if (video?.posterUrl) return video.posterUrl;
  const ytdlpThumb = raw.ytdlp?.thumbnail;
  if (isHttpUrl(ytdlpThumb)) return ytdlpThumb;
  const cardImage = raw.capture?.card?.imageUrl;
  if (isHttpUrl(cardImage)) return cardImage;
  const extras = OpenGraphImageSchema.safeParse(raw.capture?.extras);
  if (extras.success && isHttpUrl(extras.data["og:image"])) {
    return extras.data["og:image"];
  }
  return null;
}

/** SQLite caps bound parameters (~32k), so chunk the IN list; large libraries would otherwise throw "too many SQL variables". */
const TASK_ID_CHUNK = 10_000;

async function loadTasksFor(
  db: Db,
  ids: string[],
): Promise<Map<string, Task[]>> {
  if (ids.length === 0) return new Map();
  const grouped = new Map<string, Task[]>();
  for (let i = 0; i < ids.length; i += TASK_ID_CHUNK) {
    const slice = ids.slice(i, i + TASK_ID_CHUNK);
    const rows = await db
      .select()
      .from(tasks)
      .where(inArray(tasks.saveId, slice));
    for (const t of rows) {
      const existing = grouped.get(t.saveId);
      if (existing) existing.push(t);
      else grouped.set(t.saveId, [t]);
    }
  }
  return grouped;
}

const {
  rawJson: _omitRawJson,
  embedding: _omitEmbedding,
  clipEmbedding: _omitClipEmbedding,
  transcript: _omitTranscript,
  ...SAVE_LIST_COLUMNS
} = getTableColumns(saves);

const DerivedPatchSchema = z
  .object({
    caption: z.string().nullable().optional(),
    captionModel: z.string().nullable().optional(),
    ocrText: z.string().nullable().optional(),
    ocrModel: z.string().nullable().optional(),
    transcript: z.string().nullable().optional(),
    transcriptModel: z.string().nullable().optional(),
    clipEmbedding: z.array(z.number()).nullable().optional(),
    clipModel: z.string().nullable().optional(),
    aesthetic: z.array(z.string()).nullable().optional(),
    aestheticModel: z.string().nullable().optional(),
    autoTitleModel: z.string().nullable().optional(),
    suggestedTags: z.array(z.string()).nullable().optional(),
    suggestedTagsModel: z.string().nullable().optional(),
  })
  .catch({});

const FtsRowSchema = z.object({ id: z.string(), rank: z.number() });

const IdParams = z.object({ id: StringParam });
const FileParams = z.object({ id: StringParam, fileIndex: FileIndexParam });

export const savesQueries = {
  ...savesImportQueries,
  ...savesExportQueries,

  "saves.get": query(z.object({ id: StringParam }), async (params) => {
    if (!params.id) return null;
    const db = await getDb();
    const rows = await db
      .select(SAVE_LIST_COLUMNS)
      .from(saves)
      .where(eq(saves.id, params.id));
    const row = rows[0];
    if (!row) return null;
    const grouped = await loadTasksFor(db, [row.id]);
    const { rawSlim, ...rest } = row;
    return toWireSaves([{ ...rest, rawJson: rawSlim }], grouped)[0] ?? null;
  }),

  "saves.list": query(
    z.object({ limit: OptionalNumberParam }),
    async (params) => {
      const db = await getDb();
      const baseQuery = db
        .select(SAVE_LIST_COLUMNS)
        .from(saves)
        .orderBy(desc(saves.savedAt));
      const rows =
        params.limit != null
          ? await baseQuery.limit(Math.min(params.limit, 100_000))
          : await baseQuery;
      const grouped = await loadTasksFor(
        db,
        rows.map((r) => r.id),
      );
      const listRows = rows.map(({ rawSlim, ...rest }) => ({
        ...rest,
        rawJson: rawSlim,
      }));
      return toWireSaves(listRows, grouped);
    },
  ),

  "saves.listPage": query(
    z.object({
      limit: OptionalNumberParam,
      cursor: z
        .object({ savedAt: z.number(), id: z.string().min(1) })
        .nullable()
        .catch(null),
    }),
    async (params) => {
      const startedAt = Date.now();
      const limit = Math.min(Math.max(1, params.limit || 250), 500);
      const cursor = params.cursor;
      const after = cursor
        ? sql`(${saves.savedAt}, ${saves.id}) < (${cursor.savedAt}, ${cursor.id})`
        : undefined;
      const db = await getDb();
      const rows = await db
        .select(SAVE_LIST_COLUMNS)
        .from(saves)
        .where(after)
        .orderBy(desc(saves.savedAt), desc(saves.id))
        .limit(limit + 1);
      const pageRows = rows.slice(0, limit);
      const grouped = await loadTasksFor(
        db,
        pageRows.map((row) => row.id),
      );
      const totalRow = cursor
        ? null
        : (await db.select({ value: count() }).from(saves))[0];
      const listRows = pageRows.map(({ rawSlim, ...rest }) => ({
        ...rest,
        rawJson: rawSlim,
      }));
      const payload = {
        rows: toWireSaves(listRows, grouped),
        nextCursor:
          rows.length > limit
            ? cursorFor(
                pageRows.map((row) => ({
                  savedAt: row.savedAt.getTime(),
                  id: row.id,
                })),
              )
            : null,
        total: totalRow ? Number(totalRow.value ?? 0) : null,
      };
      log.info("[pond ipc] saves.listPage", {
        rows: payload.rows.length,
        total: payload.total,
        ms: Date.now() - startedAt,
      });
      return payload;
    },
  ),

  "saves.searchFts": query(
    z.object({
      q: StringParam,
      limit: OptionalNumberParam,
      deletedOnly: FlagParam,
      mode: z.enum(["all", "any"]).catch("all"),
    }),
    async (params) => {
      const q = params.q.trim();
      if (!q) return { ids: [], scores: {} };
      const limit = Math.min(Math.max(1, params.limit || 10_000), 10_000);
      const match = toFtsMatchQuery(q, params.mode);
      if (!match) return { ids: [], scores: {} };
      const db = await getDb();
      const trashClause = params.deletedOnly
        ? "s.deleted_at IS NOT NULL"
        : "s.deleted_at IS NULL";
      const rows = db.$raw
        .prepare(
          `SELECT f.id AS id, bm25(saves_fts) AS rank
         FROM saves_fts f
         JOIN saves s ON s.id = f.id
         WHERE saves_fts MATCH ? AND ${trashClause}
         ORDER BY rank
         LIMIT ?`,
        )
        .all(match, limit);
      const scores: Record<string, number> = {};
      const ids: string[] = [];
      for (const raw of rows) {
        const row = FtsRowSchema.parse(raw);
        ids.push(row.id);
        scores[row.id] = -row.rank;
      }
      return { ids, scores };
    },
  ),

  "saves.retrieve": query(
    libraryRetrievalInput.extend({
      saveIds: z.array(z.string()).max(10_000).optional(),
    }),
    async (params) => {
      const { retrieveLibrary } = await import("../../core/library-retrieval");
      const { saveIds, ...input } = params;
      return await retrieveLibrary(input, saveIds ? { saveIds } : {});
    },
  ),

  "saves.query": query(
    z.object({
      query: QueryParam,
      deletedOnly: FlagParam,
      sortKey: StringParam,
      sortDir: z.enum(["asc", "desc"]).catch("desc"),
      limit: OptionalNumberParam,
    }),
    async (params) => {
      if (!params.query || isEmptyQuery(params.query)) return { ids: [] };
      const compiled = buildWhere(params.query);
      const trash: SQL = params.deletedOnly
        ? isNotNull(saves.deletedAt)
        : isNull(saves.deletedAt);
      const where = compiled ? and(trash, compiled) : trash;
      const orderCol = sortColumn(params.sortKey);
      const order = params.sortDir === "asc" ? asc(orderCol) : desc(orderCol);
      const limit =
        params.limit != null
          ? Math.min(Math.max(1, params.limit || 1), 100_000)
          : null;
      const db = await getDb();
      const base = db
        .select({ id: saves.id })
        .from(saves)
        .where(where)
        .orderBy(asc(sql`${orderCol} is null`), order, desc(saves.id));
      const rows = limit != null ? await base.limit(limit) : await base;
      return { ids: rows.map((r) => r.id) };
    },
  ),

  "saves.getMany": query(z.object({ ids: StringListParam }), async (params) => {
    const ids = params.ids.filter(Boolean);
    if (ids.length === 0) return [];
    const db = await getDb();
    const out: SaveListRow[] = [];
    const groupedAll = new Map<string, Task[]>();
    for (let i = 0; i < ids.length; i += TASK_ID_CHUNK) {
      const slice = ids.slice(i, i + TASK_ID_CHUNK);
      const rows = await db
        .select(SAVE_LIST_COLUMNS)
        .from(saves)
        .where(inArray(saves.id, slice));
      const grouped = await loadTasksFor(
        db,
        rows.map((r) => r.id),
      );
      for (const [k, v] of grouped) groupedAll.set(k, v);
      for (const { rawSlim, ...rest } of rows) {
        out.push({ ...rest, rawJson: rawSlim });
      }
    }
    return toWireSaves(out, groupedAll);
  }),

  "saves.rawJson": query(IdParams, async (params) => {
    const db = await getDb();
    const id = params.id;
    if (!id) return { id: "", rawJson: null };
    const rows = await db
      .select({ rawJson: saves.rawJson })
      .from(saves)
      .where(eq(saves.id, id));
    return { id, rawJson: rows[0]?.rawJson ?? null };
  }),

  async "saves.emptyTrash"() {
    const db = await getDb();
    const rows = await db
      .select()
      .from(saves)
      .where(isNotNull(saves.deletedAt));
    if (rows.length === 0) return { ok: true, count: 0 };
    const txs: Transaction[] = rows.map((r) => ({
      kind: "purge",
      model: "save",
      id: r.id,
      before: r,
      meta: { actor: "user", actorReason: "empty-trash" },
    }));
    await executeBatch(txs);
    for (const tx of txs) recordForUndo(tx);
    return { ok: true, count: txs.length };
  },

  async "saves.restoreAll"() {
    const db = await getDb();
    const rows = await db
      .select({ id: saves.id })
      .from(saves)
      .where(isNotNull(saves.deletedAt));
    if (rows.length === 0) return { ok: true, count: 0 };
    const txs: Transaction[] = rows.map((r) => ({
      kind: "untrash",
      model: "save",
      id: r.id,
      meta: { actor: "user", actorReason: "restore-all" },
    }));
    await executeBatch(txs);
    for (const tx of txs) recordForUndo(tx);
    return { ok: true, count: txs.length };
  },

  "saves.retryFailed": query(
    z.object({
      ids: z.array(z.coerce.string()).optional().catch(undefined),
    }),
    async (params) => {
      const requeued = await retryFailedSaves(params.ids?.filter(Boolean));
      return { ok: true as const, requeued };
    },
  ),

  "saves.filePath": query(FileParams, async (params) => {
    if (!params.id) return { ok: false as const, reason: "not_found" as const };
    return resolveSaveFilePath(params.id, params.fileIndex);
  }),

  "saves.setPhash": query(
    z.object({ id: StringParam, phash: NullableStringParam }),
    async (params) => {
      if (!params.id) return { ok: false };
      await persistSave(
        params.id,
        { phash: params.phash },
        { actorReason: "duplicates:phash" },
      );
      return { ok: true };
    },
  ),

  async "saves.embeddings"() {
    const db = await getDb();
    const rows = await db
      .select({
        id: saves.id,
        embeddingModel: saves.embeddingModel,
      })
      .from(saves)
      .where(isNotNull(saves.embeddingModel));
    return rows.map((r) => ({
      id: r.id,
      embedding: null,
      embeddingModel: r.embeddingModel ?? null,
    }));
  },

  "saves.getEmbedding": query(IdParams, async (params) => {
    const db = await getDb();
    const rows = await db
      .select({
        id: saves.id,
        embedding: saves.embedding,
        embeddingModel: saves.embeddingModel,
      })
      .from(saves)
      .where(eq(saves.id, params.id))
      .limit(1);
    const row = rows[0];
    if (!row) return { id: params.id, embedding: null, embeddingModel: null };
    return {
      id: row.id,
      embedding: row.embedding ?? null,
      embeddingModel: row.embeddingModel ?? null,
    };
  }),

  "saves.setEmbedding": query(
    z.object({
      id: StringParam,
      embedding: z
        .array(z.union([z.number(), z.nan()]))
        .nullable()
        .catch(null),
      embeddingModel: NullableStringParam,
    }),
    async (params) => {
      if (!params.id) return { ok: false };
      const db = await getDb();
      await db
        .update(saves)
        .set({
          embedding: params.embedding,
          embeddingModel: params.embeddingModel,
        })
        .where(eq(saves.id, params.id));
      const vector = parseJsonVector(params.embedding);
      if (vector) upsertVec(db.$raw, "text", params.id, vector);
      return { ok: true };
    },
  ),

  async "saves.clipEmbeddings"() {
    const db = await getDb();
    const rows = await db
      .select({
        id: saves.id,
        clipModel: saves.clipModel,
      })
      .from(saves)
      .where(isNotNull(saves.clipModel));
    return rows.map((r) => ({
      id: r.id,
      clipEmbedding: null,
      clipModel: r.clipModel ?? null,
    }));
  },

  "saves.patchDerived": query(
    z.object({ id: StringParam, patch: DerivedPatchSchema }),
    async (params) => {
      if (!params.id) return { ok: false as const };
      if (Object.keys(params.patch).length === 0) return { ok: false as const };
      const db = await getDb();
      await db.update(saves).set(params.patch).where(eq(saves.id, params.id));
      if (params.patch.clipEmbedding) {
        const vector = parseJsonVector(params.patch.clipEmbedding);
        if (vector) upsertVec(db.$raw, "clip", params.id, vector);
      }
      return { ok: true as const };
    },
  ),

  "saves.copyImage": query(FileParams, async (params) => {
    if (!params.id) return { ok: false as const, reason: "not_found" as const };
    const target = await resolveSaveFilePath(params.id, params.fileIndex);
    if (!target.ok) return target;
    try {
      const img = nativeImage.createFromPath(target.path);
      if (img.isEmpty()) {
        return { ok: false as const, reason: "missing" as const };
      }
      clipboard.writeImage(img);
      return { ok: true as const };
    } catch (err) {
      log.warn("[pond ipc] saves.copyImage failed", err);
      return { ok: false as const, reason: "internal_error" as const };
    }
  }),

  "saves.copyFile": query(FileParams, async (params) => {
    if (!params.id) return { ok: false as const, reason: "not_found" as const };
    const target = await resolveSaveFilePath(params.id, params.fileIndex);
    if (!target.ok) return target;
    try {
      writeFileRefsToClipboard([target.path]);
      return { ok: true as const };
    } catch (err) {
      log.warn("[pond ipc] saves.copyFile failed", err);
      return { ok: false as const, reason: "internal_error" as const };
    }
  }),

  "saves.copyFiles": query(
    z.object({
      files: z.array(FileParams.catch({ id: "", fileIndex: 0 })).catch([]),
    }),
    async (params) => {
      if (params.files.length === 0) {
        return { ok: false as const, reason: "not_found" as const };
      }
      const paths: string[] = [];
      for (const entry of params.files) {
        if (!entry.id) continue;
        const target = await resolveSaveFilePath(entry.id, entry.fileIndex);
        if (target.ok) paths.push(target.path);
      }
      if (paths.length === 0) {
        return { ok: false as const, reason: "missing" as const };
      }
      try {
        writeFileRefsToClipboard(paths);
        return { ok: true as const, copied: paths.length };
      } catch (err) {
        log.warn("[pond ipc] saves.copyFiles failed", err);
        return { ok: false as const, reason: "internal_error" as const };
      }
    },
  ),

  /** Main-process pasteboard write; renderer clipboard rejects once a closing menu steals focus. */
  "clipboard.writeText": query(z.object({ text: StringParam }), (params) => {
    const text = params.text;
    if (!text) return { ok: false as const };
    try {
      clipboard.writeText(text);
      return { ok: true as const };
    } catch (err) {
      log.warn("[pond ipc] clipboard.writeText failed", err);
      return { ok: false as const };
    }
  }),

  async "saves.backfillColors"() {
    const { extractPalette } = await import("../../lib/palette");
    const { encodeBlurhash, pickBlurhashStill } = await import(
      "../../lib/blurhash"
    );
    const { itemFile } = await import("../../paths");

    const db = await getDb();
    const rows = await db.select().from(saves);

    let updated = 0;
    for (const row of rows) {
      const still = pickBlurhashStill(row);
      const needsColors =
        row.mediaType === "image" && (row.dominantColors ?? []).length === 0;
      const needsHash = !row.blurhash && still !== null;
      if (!needsColors && !needsHash) continue;
      if (!still) continue;
      const path = itemFile(row.id, still.path);
      const patch: Parameters<typeof persistSave>[1] = {};
      if (needsColors) {
        const colors = await extractPalette(path);
        if (colors.length > 0) patch.dominantColors = colors;
      }
      if (needsHash) {
        const hash = await encodeBlurhash(path);
        if (hash) patch.blurhash = hash;
      }
      if (Object.keys(patch).length === 0) continue;
      await persistSave(row.id, patch, { actorReason: "color:backfill" });
      updated++;
    }
    return { ok: true, updated };
  },

  "saves.publicImageUrl": query(IdParams, async (params) => {
    if (!params.id) return { ok: false as const, url: null };
    const db = await getDb();
    const rows = await db.select().from(saves).where(eq(saves.id, params.id));
    const row = rows[0];
    if (!row) return { ok: false as const, url: null };
    return { ok: true as const, url: derivePublicImageUrl(row.rawJson) };
  }),

  "saves.ensureTextCover": query(
    z.object({ id: StringParam, force: FlagParam }),
    async (params) => {
      if (!params.id) return { ok: false as const, captured: 0 };
      const captured = await runRenderTextCover(params.id, {
        force: params.force,
      });
      return { ok: true as const, captured };
    },
  ),

  async "saves.findDuplicates"() {
    const db = await getDb();
    const rows = await db
      .select({
        id: saves.id,
        title: saves.title,
        phash: saves.phash,
        files: saves.files,
      })
      .from(saves)
      .where(isNull(saves.deletedAt));
    const byHash = new Map<string, string[]>();
    for (const row of rows) {
      const file = row.files?.[0];
      const key = file?.sha256 || row.phash;
      if (!key) continue;
      const list = byHash.get(key) ?? [];
      list.push(row.id);
      byHash.set(key, list);
    }
    const groups = [...byHash.values()]
      .filter((ids) => ids.length > 1)
      .map((ids) => ({ ids }));
    return { groups };
  },

  "saves.mergeDuplicates": query(
    z.object({ keepId: StringParam, ids: StringListParam }),
    async (params) => {
      const keepId = params.keepId.trim();
      const extras = params.ids.filter((id) => id && id !== keepId);
      if (!keepId || extras.length === 0) return { ok: false, trashed: 0 };
      const txs: Transaction[] = extras.map((id) => ({
        kind: "trash" as const,
        model: "save" as const,
        id,
        meta: { actor: "user" as const, actorReason: "merge-duplicates" },
      }));
      await executeBatch(txs);
      return { ok: true, trashed: extras.length };
    },
  ),

  "saves.batchRename": query(
    z.object({ ids: StringListParam, pattern: StringParam }),
    async (params) => {
      const pattern = params.pattern.trim();
      if (!pattern || params.ids.length === 0) return { ok: false, renamed: 0 };
      const db = await getDb();
      const rows = await db
        .select()
        .from(saves)
        .where(inArray(saves.id, params.ids));
      const txs: Transaction[] = [];
      let n = 0;
      for (const row of rows) {
        n += 1;
        const stored = row.files[0];
        const family =
          stored?.family ??
          (stored?.path
            ? await extractFontFamily(itemFile(row.id, stored.path))
            : null);
        const title = renameWithFamily(pattern, {
          n,
          title: row.title ?? "Untitled",
          id: row.id,
          family,
        });
        if (title === row.title) continue;
        txs.push({
          kind: "update",
          model: "save",
          id: row.id,
          patch: { title },
          before: { title: row.title },
          meta: { actor: "user", actorReason: "batch-rename" },
        });
      }
      if (txs.length > 0) await executeBatch(txs);
      return { ok: true, renamed: txs.length };
    },
  ),
} satisfies QueryHandlerMap;

function sortColumn(sortKey: string): SQLWrapper {
  switch (sortKey) {
    case "createdAt":
      return saves.createdAt;
    case "publishedAt":
      return saves.publishedAt;
    case "title":
      return sql`lower(coalesce(${saves.title}, ''))`;
    case "tagName":
      return sql`(select lower(value) from json_each(${saves.tags}) order by lower(value) limit 1)`;
    case "tagCount":
      return sql`json_array_length(${saves.tags})`;
    case "duration":
      return durationProjection();
    case "rating":
      return saves.rating;
    case "fileCount":
      return sql`json_array_length(${saves.files})`;
    case "width":
      return saves.width;
    case "height":
      return saves.height;
    case "dimensions":
      return sql`cast(${saves.width} as real) * cast(${saves.height} as real)`;
    case "aspectRatio":
      return sql`cast(${saves.width} as real) / nullif(cast(${saves.height} as real), 0)`;
    case "creator":
      return sql`lower(coalesce(${saves.author}, ''))`;
    case "source":
      return sql`lower(${saves.source})`;
    case "type":
      return sql`lower(coalesce(${saves.mediaType}, ''))`;
    default:
      return saves.savedAt;
  }
}

function toFtsMatchQuery(q: string, mode: "all" | "any"): string | null {
  const tokens = q
    .split(/\s+/)
    .map((t) =>
      t.replaceAll('"', "").replaceAll("'", "").replaceAll("*", "").trim(),
    )
    .filter((t) => t.length > 0);
  if (tokens.length === 0) return null;
  const quoted = tokens.map((t) => `"${t}"*`);
  return quoted.join(mode === "any" ? " OR " : " ");
}
