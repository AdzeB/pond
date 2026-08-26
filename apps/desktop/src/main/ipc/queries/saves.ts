import { type Save, saves, type Task, tasks } from "@pond/schema/db";
import { buildWhere, isEmptyQuery, type Query } from "@pond/schema/filters";
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
import { executeBatch } from "../../core/executor";
import { persistSave } from "../../core/persist-save";
import { retryFailedSaves } from "../../core/pipeline/enqueue";
import { runRenderTextCover } from "../../core/pipeline/workers/render-text-cover";
import { recordForUndo } from "../../core/undo";
import type { Db } from "../../db";
import { getDb } from "../../db";
import { type QueryHandlerMap, resolveSaveFilePath } from "../helpers";
import { toWireSaves } from "../wire";
import { savesExportQueries } from "./saves-export";
import { savesImportQueries } from "./saves-import";
import { cursorFor, type SavePageCursor } from "./saves-page";

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

function derivePublicImageUrl(raw: RawJson | null): string | null {
  if (!raw) return null;
  const media = raw.capture?.media ?? [];
  const image = media.find((m) => m.type === "image" && isHttpUrl(m.url));
  if (image) return image.url;
  const video = media.find((m) => m.type === "video" && isHttpUrl(m.posterUrl));
  if (video?.posterUrl) return video.posterUrl;
  const ytdlpThumb = raw.ytdlp?.thumbnail;
  if (isHttpUrl(ytdlpThumb)) return ytdlpThumb;
  const card = raw.capture?.card;
  if (card && typeof card === "object") {
    const cardImage = card.imageUrl;
    if (typeof cardImage === "string" && isHttpUrl(cardImage)) return cardImage;
  }
  const extras =
    raw.capture?.extras && typeof raw.capture.extras === "object"
      ? (raw.capture.extras as Record<string, unknown>)
      : null;
  const ogImage = extras?.["og:image"];
  if (typeof ogImage === "string" && isHttpUrl(ogImage)) return ogImage;
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

const DERIVED_COLUMNS = {
  caption: saves.caption,
  captionModel: saves.captionModel,
  ocrText: saves.ocrText,
  ocrModel: saves.ocrModel,
  transcript: saves.transcript,
  transcriptModel: saves.transcriptModel,
  clipEmbedding: saves.clipEmbedding,
  clipModel: saves.clipModel,
  aesthetic: saves.aesthetic,
  aestheticModel: saves.aestheticModel,
  autoTitleModel: saves.autoTitleModel,
  suggestedTags: saves.suggestedTags,
  suggestedTagsModel: saves.suggestedTagsModel,
} as const;

type DerivedKey = keyof typeof DERIVED_COLUMNS;

export const savesQueries: QueryHandlerMap = {
  ...savesImportQueries,
  ...savesExportQueries,

  async "saves.list"(params) {
    const db = await getDb();
    const hasExplicitLimit = params.limit != null;
    const baseQuery = db
      .select(SAVE_LIST_COLUMNS)
      .from(saves)
      .orderBy(desc(saves.savedAt));
    const rows = hasExplicitLimit
      ? await baseQuery.limit(Math.min(Number(params.limit), 100_000))
      : await baseQuery;
    const grouped = await loadTasksFor(
      db,
      rows.map((r) => r.id),
    );
    const listRows = rows.map(({ rawSlim, ...rest }) => ({
      ...rest,
      rawJson: rawSlim,
    })) as Save[];
    return toWireSaves(listRows, grouped);
  },

  async "saves.listPage"(params) {
    const startedAt = Date.now();
    const limit = Math.min(Math.max(1, Number(params.limit) || 250), 500);
    const raw = params.cursor as Partial<SavePageCursor> | undefined;
    const savedAt = raw?.savedAt;
    const cursor =
      typeof savedAt === "number" &&
      Number.isFinite(savedAt) &&
      typeof raw?.id === "string" &&
      raw.id
        ? { savedAt, id: raw.id }
        : null;
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
    const totalRow = (await db.select({ value: count() }).from(saves))[0];
    const listRows = pageRows.map(({ rawSlim, ...rest }) => ({
      ...rest,
      rawJson: rawSlim,
    })) as Save[];
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
      total: Number(totalRow?.value ?? 0),
    };
    log.info("[pond ipc] saves.listPage", {
      rows: payload.rows.length,
      total: payload.total,
      ms: Date.now() - startedAt,
    });
    return payload;
  },

  async "saves.searchFts"(params) {
    const q = String(params.q ?? "").trim();
    if (!q)
      return { ids: [] as string[], scores: {} as Record<string, number> };
    const limit = Math.min(
      Math.max(1, Number(params.limit ?? 10_000) || 10_000),
      10_000,
    );
    const deletedOnly = Boolean(params.deletedOnly);
    const match = toFtsMatchQuery(q, params.mode === "any" ? "any" : "all");
    if (!match) {
      return { ids: [] as string[], scores: {} as Record<string, number> };
    }
    const db = await getDb();
    const trashClause = deletedOnly
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
      .all(match, limit) as Array<{ id: string; rank: number }>;
    const scores: Record<string, number> = {};
    const ids: string[] = [];
    for (const row of rows) {
      ids.push(row.id);
      scores[row.id] = -row.rank;
    }
    return { ids, scores };
  },

  async "saves.query"(params) {
    const query = params.query as Query | null | undefined;
    if (!query || isEmptyQuery(query)) {
      return { ids: [] as string[] };
    }
    const compiled = buildWhere(query);
    const deletedOnly = Boolean(params.deletedOnly);
    const trash: SQL = deletedOnly
      ? isNotNull(saves.deletedAt)
      : isNull(saves.deletedAt);
    const where = compiled ? and(trash, compiled) : trash;
    const sortKey = String(params.sortKey ?? "savedAt");
    const sortDir = params.sortDir === "asc" ? "asc" : "desc";
    const orderCol = sortColumn(sortKey);
    const order = sortDir === "asc" ? asc(orderCol) : desc(orderCol);
    const limit =
      params.limit != null
        ? Math.min(Math.max(1, Number(params.limit) || 1), 100_000)
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

  async "saves.getMany"(params) {
    const ids = Array.isArray(params.ids)
      ? params.ids.map((id) => String(id)).filter(Boolean)
      : [];
    if (ids.length === 0) return [];
    const db = await getDb();
    const out: Save[] = [];
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
        out.push({ ...rest, rawJson: rawSlim } as Save);
      }
    }
    return toWireSaves(out, groupedAll);
  },

  async "saves.rawJson"(params) {
    const db = await getDb();
    const id = String(params.id ?? "");
    if (!id) return { id: "", rawJson: null };
    const rows = await db
      .select({ rawJson: saves.rawJson })
      .from(saves)
      .where(eq(saves.id, id));
    return { id, rawJson: rows[0]?.rawJson ?? null };
  },

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

  async "saves.retryFailed"(params) {
    const ids = Array.isArray(params.ids)
      ? (params.ids as unknown[]).map(String).filter(Boolean)
      : undefined;
    const requeued = await retryFailedSaves(ids);
    return { ok: true as const, requeued };
  },

  async "saves.filePath"(params) {
    const id = String(params.id ?? "");
    const fileIndex = Number(params.fileIndex ?? 0);
    if (!id) return { ok: false as const, reason: "not_found" as const };
    return resolveSaveFilePath(id, Number.isFinite(fileIndex) ? fileIndex : 0);
  },

  async "saves.setPhash"(params) {
    const id = String(params.id ?? "");
    const phash = params.phash != null ? String(params.phash) : null;
    if (!id) return { ok: false };
    await persistSave(id, { phash }, { actorReason: "duplicates:phash" });
    return { ok: true };
  },

  async "saves.embeddings"() {
    const db = await getDb();
    const rows = await db
      .select({
        id: saves.id,
        embedding: saves.embedding,
        embeddingModel: saves.embeddingModel,
      })
      .from(saves)
      .where(isNotNull(saves.embedding));
    return rows.map((r) => ({
      id: r.id,
      embedding: r.embedding ?? null,
      embeddingModel: r.embeddingModel ?? null,
    }));
  },

  async "saves.setEmbedding"(params) {
    const id = String(params.id ?? "");
    if (!id) return { ok: false };
    const raw = params.embedding;
    const embedding =
      Array.isArray(raw) && raw.every((n) => typeof n === "number")
        ? (raw as number[])
        : null;
    const embeddingModel =
      params.embeddingModel != null ? String(params.embeddingModel) : null;
    const db = await getDb();
    await db
      .update(saves)
      .set({ embedding, embeddingModel })
      .where(eq(saves.id, id));
    return { ok: true };
  },

  async "saves.clipEmbeddings"() {
    const db = await getDb();
    const rows = await db
      .select({
        id: saves.id,
        clipEmbedding: saves.clipEmbedding,
        clipModel: saves.clipModel,
      })
      .from(saves)
      .where(isNotNull(saves.clipEmbedding));
    return rows.map((r) => ({
      id: r.id,
      clipEmbedding: r.clipEmbedding ?? null,
      clipModel: r.clipModel ?? null,
    }));
  },

  async "saves.patchDerived"(params) {
    const id = String(params.id ?? "");
    if (!id) return { ok: false as const };
    const patch = (params.patch ?? {}) as Record<string, unknown>;
    const set: Record<string, unknown> = {};
    for (const key of Object.keys(patch) as DerivedKey[]) {
      if (key in DERIVED_COLUMNS) set[key] = patch[key];
    }
    if (Object.keys(set).length === 0) return { ok: false as const };
    const db = await getDb();
    await db.update(saves).set(set).where(eq(saves.id, id));
    return { ok: true as const };
  },

  async "saves.copyImage"(params) {
    const id = String(params.id ?? "");
    const fileIndex = Number(params.fileIndex ?? 0);
    if (!id) return { ok: false as const, reason: "not_found" as const };
    const target = await resolveSaveFilePath(
      id,
      Number.isFinite(fileIndex) ? fileIndex : 0,
    );
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
  },

  async "saves.copyFile"(params) {
    const id = String(params.id ?? "");
    const fileIndex = Number(params.fileIndex ?? 0);
    if (!id) return { ok: false as const, reason: "not_found" as const };
    const target = await resolveSaveFilePath(
      id,
      Number.isFinite(fileIndex) ? fileIndex : 0,
    );
    if (!target.ok) return target;
    try {
      writeFileRefsToClipboard([target.path]);
      return { ok: true as const };
    } catch (err) {
      log.warn("[pond ipc] saves.copyFile failed", err);
      return { ok: false as const, reason: "internal_error" as const };
    }
  },

  async "saves.copyFiles"(params) {
    const raw = params.files;
    if (!Array.isArray(raw) || raw.length === 0) {
      return { ok: false as const, reason: "not_found" as const };
    }
    const paths: string[] = [];
    for (const entry of raw) {
      if (!entry || typeof entry !== "object") continue;
      const rec = entry as Record<string, unknown>;
      const id = String(rec.id ?? "");
      const fileIndex = Number(rec.fileIndex ?? 0);
      if (!id) continue;
      const target = await resolveSaveFilePath(
        id,
        Number.isFinite(fileIndex) ? fileIndex : 0,
      );
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

  /** Main-process pasteboard write; renderer clipboard rejects once a closing menu steals focus. */
  async "clipboard.writeText"(params) {
    const text = String(params.text ?? "");
    if (!text) return { ok: false as const };
    try {
      clipboard.writeText(text);
      return { ok: true as const };
    } catch (err) {
      log.warn("[pond ipc] clipboard.writeText failed", err);
      return { ok: false as const };
    }
  },

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
      const patch: { dominantColors?: string[]; blurhash?: string } = {};
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

  async "saves.publicImageUrl"(params) {
    const id = String(params.id ?? "");
    if (!id) return { ok: false as const, url: null };
    const db = await getDb();
    const rows = await db.select().from(saves).where(eq(saves.id, id));
    const row = rows[0];
    if (!row) return { ok: false as const, url: null };
    const raw = (row.rawJson ?? null) as RawJson | null;
    const url = derivePublicImageUrl(raw);
    return { ok: true as const, url };
  },

  async "saves.ensureTextCover"(params) {
    const id = String(params.id ?? "");
    if (!id) return { ok: false as const, captured: 0 };
    const force = Boolean(params.force);
    const captured = await runRenderTextCover(id, { force });
    return { ok: true as const, captured };
  },
};

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
    case "fileSize":
      return saves.fileSize;
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
