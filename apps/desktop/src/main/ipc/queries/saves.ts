import { type Save, saves, type Task, tasks } from "@pond/schema/db";
import type { RawJson } from "@pond/schema/raw";
import type { Transaction } from "@pond/schema/tx";
import { desc, eq, getTableColumns, inArray, isNotNull } from "drizzle-orm";
import { clipboard, nativeImage } from "electron";
import log from "electron-log/main.js";
import { executeBatch } from "../../core/executor";
import { persistSave } from "../../core/persist-save";
import { recordForUndo } from "../../core/undo";
import type { Db } from "../../db";
import { getDb } from "../../db";
import { type QueryHandlerMap, resolveSaveFilePath } from "../helpers";
import { toWireSaves } from "../wire";
import { savesExportQueries } from "./saves-export";
import { savesImportQueries } from "./saves-import";

function isHttpUrl(u: string | undefined | null): u is string {
  if (!u) return false;
  return u.startsWith("http://") || u.startsWith("https://");
}

// Public http(s) URL for the save's primary image, for reverse image search.
function derivePublicImageUrl(raw: RawJson | null): string | null {
  if (!raw) return null;
  const media = raw.capture?.media ?? [];
  const image = media.find((m) => m.type === "image" && isHttpUrl(m.url));
  if (image) return image.url;
  const video = media.find((m) => m.type === "video" && isHttpUrl(m.posterUrl));
  if (video?.posterUrl) return video.posterUrl;
  const ytdlpThumb = raw.ytdlp?.thumbnail;
  if (isHttpUrl(ytdlpThumb)) return ytdlpThumb;
  const ogImage = (() => {
    const extras = raw.capture?.extras;
    if (!extras || typeof extras !== "object") return null;
    const candidate = (extras as Record<string, unknown>)["og:image"];
    if (typeof candidate === "string" && isHttpUrl(candidate)) return candidate;
    return null;
  })();
  return ogImage;
}

// SQLite caps bound parameters (~32k), so chunk the IN list; without a limit on
// saves.list this would otherwise throw "too many SQL variables" on large libraries.
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

// Every saves column except the heavy rawJson blob; raw_slim carries the projection
// the grid needs, so saves.list never reads or parses rawJson.
const { rawJson: _omitRawJson, ...SAVE_LIST_COLUMNS } = getTableColumns(saves);

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
    // raw_slim already holds the slim projection, so present it as rawJson directly
    // instead of re-slimming the (unselected) full blob.
    const listRows = rows.map(({ rawSlim, ...rest }) => ({
      ...rest,
      rawJson: rawSlim,
    })) as Save[];
    return toWireSaves(listRows, grouped);
  },

  // Full rawJson for one save; the detail view hydrates it lazily.
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

  // Persist an on-device NSFW verdict; system write, DB-only, emits a sync action.
  async "saves.setSensitivity"(params) {
    const id = String(params.id ?? "");
    const raw = params.sensitivity;
    const sensitivity = raw === "safe" || raw === "sensitive" ? raw : null;
    const sensitivityModel =
      params.sensitivityModel != null ? String(params.sensitivityModel) : null;
    if (!id) return { ok: false };
    await persistSave(
      id,
      { sensitivity, sensitivityModel },
      { actorReason: "nsfw:classify" },
    );
    return { ok: true };
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

  async "saves.backfillColors"() {
    const { extractPalette } = await import("../../lib/palette");
    const { itemFile } = await import("../../paths");

    const db = await getDb();
    const rows = await db
      .select()
      .from(saves)
      .where(eq(saves.mediaType, "image"));

    let updated = 0;
    for (const row of rows) {
      if ((row.dominantColors ?? []).length > 0) continue;
      const files = row.files ?? [];
      const cover = files[row.coverIndex ?? 0] ?? files[0];
      if (!cover) continue;
      const colors = await extractPalette(itemFile(row.id, cover.path));
      if (colors.length > 0) {
        await persistSave(
          row.id,
          { dominantColors: colors },
          { actorReason: "color:backfill" },
        );
        updated++;
      }
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
};
