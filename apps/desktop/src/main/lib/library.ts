import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import {
  mkdir,
  readdir,
  readFile,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import { basename, extname, join } from "node:path";
import type { Save } from "@pond/schema/db";
import type { TxSaveFile } from "@pond/schema/tx";
import log from "electron-log/main.js";
import { itemDir, itemFile, resolvePaths } from "../paths";
import {
  applyPatchToInfo,
  INFO_FILE,
  INFO_SCHEMA,
  type InfoDoc,
  type InfoFile,
  infoDocFromSave,
  LEGACY_METADATA_FILE,
  SOURCE_FILE,
  toIso,
} from "./library-format";

export interface ItemMetadata {
  id: string;
  source: string;
  sourceId: string;
  url: string;
  name: string | null;
  annotation: string;
  tags: string[];
  folders: string[];
  ext: string | null;
  size: number | null;
  width: number | null;
  height: number | null;
  btime: number;
  mtime: number;
  importedAt: number;
  isDeleted: boolean;
  deletedAt: number | null;
  files: Array<{
    kind: string;
    path: string;
    sha256: string;
    size: number;
  }>;
  pond: {
    schemaVersion: number;
    rawSource?: unknown;
    description?: string | null;
    author?: string | null;
    notes?: string | null;
    mediaType?: string | null;
    coverIndex?: number;
  };
}

function sha256(bytes: Buffer): string {
  return createHash("sha256").update(bytes).digest("hex");
}

export function inferKindFromFilename(filename: string): string {
  if (filename.startsWith("poster")) return "poster";
  if (filename.startsWith("cover")) return "cover";
  if (filename.startsWith("video")) return "video";
  if (filename.startsWith("media-")) return "media";
  if (filename.startsWith("avatar")) return "avatar";
  return "other";
}

function decodeFile(file: TxSaveFile): { filename: string; buf: Buffer } {
  const buf = Buffer.isBuffer(file.bytes)
    ? file.bytes
    : Buffer.from(file.bytes);
  return { filename: file.filename, buf };
}

// Write `info.json` (clean human content) and `source.json` (raw
// capture payload) into an item folder, creating it if needed.
export async function writeInfoFiles(
  id: string,
  info: InfoDoc,
  rawSource: unknown,
): Promise<void> {
  const dir = itemDir(id);
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, INFO_FILE), JSON.stringify(info, null, 2));
  await writeFile(
    join(dir, SOURCE_FILE),
    JSON.stringify(rawSource ?? null, null, 2),
  );
}

// Write a save's `info.json` + `source.json` from its current row, deriving
// the file manifest from `save.files`. The item dir is created if missing, so
// this also covers saves with no blobs (a link, a text-only capture).
export async function writeSaveInfo(save: Save): Promise<void> {
  const manifest: InfoFile[] = (save.files ?? []).map((f) => ({
    kind: f.kind,
    path: f.path,
    sha256: f.sha256,
    size: f.size,
    ...(f.mimeType ? { mimeType: f.mimeType } : {}),
    ...(f.width ? { width: f.width } : {}),
    ...(f.height ? { height: f.height } : {}),
  }));
  await writeInfoFiles(save.id, infoDocFromSave(save, manifest), save.rawJson);
}

export async function writeItemFiles(
  id: string,
  save: Save,
  files: TxSaveFile[] = [],
): Promise<{ written: Array<{ filename: string; buf: Buffer }> }> {
  const dir = itemDir(id);
  await mkdir(dir, { recursive: true });

  const decoded = files.map(decodeFile);
  for (const { filename, buf } of decoded) {
    await writeFile(join(dir, filename), buf);
  }

  const manifest: InfoFile[] = decoded.map((f) => ({
    kind: inferKindFromFilename(f.filename),
    path: f.filename,
    sha256: sha256(f.buf),
    size: f.buf.length,
  }));
  await writeInfoFiles(id, infoDocFromSave(save, manifest), save.rawJson);
  return { written: decoded };
}

// Apply a save patch to an item's on-disk `info.json` (and `source.json`
// if the raw payload changed), preserving fields the patch doesn't touch.
// Returns false when the item folder has no readable info to patch.
export async function applyItemPatch(
  id: string,
  patch: Partial<Save>,
  files: TxSaveFile[] = [],
): Promise<boolean> {
  const current = await readInfoForEdit(id);
  if (!current) return false;

  const decoded = files.map(decodeFile);
  for (const { filename, buf } of decoded) {
    await writeFile(join(itemDir(id), filename), buf);
  }

  const next = applyPatchToInfo(current.info, patch);
  if (decoded.length > 0) {
    next.files = decoded.map((f) => ({
      kind: inferKindFromFilename(f.filename),
      path: f.filename,
      sha256: sha256(f.buf),
      size: f.buf.length,
    }));
  }

  const rawSource =
    patch.rawJson !== undefined ? patch.rawJson : current.rawSource;
  await writeInfoFiles(id, next, rawSource);
  return true;
}

export async function readItemMetadata(
  id: string,
): Promise<ItemMetadata | null> {
  const infoPath = itemFile(id, INFO_FILE);
  if (existsSync(infoPath)) {
    try {
      const info = JSON.parse(await readFile(infoPath, "utf8")) as InfoDoc;
      return metadataFromInfo(id, info, await readSourceDoc(id));
    } catch (err) {
      log.warn("[pond library] corrupt info.json", id, err);
      return null;
    }
  }
  const legacy = itemFile(id, LEGACY_METADATA_FILE);
  if (!existsSync(legacy)) return null;
  try {
    const raw = JSON.parse(await readFile(legacy, "utf8")) as unknown;
    return normalizeItemMetadata(id, raw);
  } catch (err) {
    log.warn("[pond library] corrupt metadata.json", id, err);
    return null;
  }
}

async function readSourceDoc(id: string): Promise<unknown> {
  const path = itemFile(id, SOURCE_FILE);
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(await readFile(path, "utf8"));
  } catch {
    return null;
  }
}

// Read an item's `info.json` for editing, preferring the schema-3 file
// and falling back to the legacy `metadata.json` (upgraded in place on
// the next write). Carries `rawSource` alongside so an edit never drops
// the raw capture payload.
async function readInfoForEdit(
  id: string,
): Promise<{ info: InfoDoc; rawSource: unknown } | null> {
  const infoPath = itemFile(id, INFO_FILE);
  if (existsSync(infoPath)) {
    try {
      const info = JSON.parse(await readFile(infoPath, "utf8")) as InfoDoc;
      return { info, rawSource: await readSourceDoc(id) };
    } catch (err) {
      log.warn("[pond library] corrupt info.json", id, err);
      return null;
    }
  }
  const legacy = await readItemMetadata(id);
  if (!legacy) return null;
  return {
    info: infoDocFromMetadata(legacy),
    rawSource: legacy.pond.rawSource,
  };
}

function metadataFromInfo(
  id: string,
  info: InfoDoc,
  rawSource: unknown,
): ItemMetadata {
  const files = (info.files ?? []).map((f) => ({
    kind: String(f.kind ?? "other"),
    path: String(f.path ?? ""),
    sha256: String(f.sha256 ?? ""),
    size: Number(f.size ?? 0),
  }));
  const coverIndex = typeof info.coverIndex === "number" ? info.coverIndex : 0;
  const coverFile = files[coverIndex] ?? files[0];
  const createdMs = parseTimestamp(info.createdAt);
  const savedMs = parseTimestamp(info.savedAt);
  const deletedMs = parseTimestamp(info.deletedAt);
  return {
    id,
    source: info.source,
    sourceId: info.sourceId,
    url: typeof info.url === "string" ? info.url : "",
    name: info.title ?? null,
    annotation: info.notes ?? "",
    tags: Array.isArray(info.tags) ? info.tags.map(String) : [],
    folders: [],
    ext: files[0]?.path ? extname(files[0].path).slice(1) || null : null,
    size: coverFile?.size ?? null,
    width: typeof info.width === "number" ? info.width : null,
    height: typeof info.height === "number" ? info.height : null,
    btime: createdMs ?? Date.now(),
    mtime: savedMs ?? createdMs ?? Date.now(),
    importedAt: savedMs ?? Date.now(),
    isDeleted: deletedMs != null,
    deletedAt: deletedMs,
    files,
    pond: {
      schemaVersion: INFO_SCHEMA,
      rawSource,
      description: info.description ?? null,
      author: info.author ?? null,
      notes: info.notes ?? null,
      mediaType: info.mediaType ?? null,
      coverIndex,
    },
  };
}

function infoDocFromMetadata(m: ItemMetadata): InfoDoc {
  return {
    schema: INFO_SCHEMA,
    id: m.id,
    source: m.source,
    sourceId: m.sourceId,
    url: m.url,
    title: m.name,
    description: m.pond.description ?? null,
    author: m.pond.author ?? null,
    lang: null,
    siteName: null,
    notes: m.pond.notes ?? (m.annotation || null),
    tags: m.tags,
    mediaType: m.pond.mediaType ?? null,
    coverIndex: m.pond.coverIndex ?? 0,
    width: m.width,
    height: m.height,
    publishedAt: null,
    savedAt: m.importedAt ? new Date(m.importedAt).toISOString() : null,
    createdAt: m.btime ? new Date(m.btime).toISOString() : null,
    deletedAt: m.deletedAt ? new Date(m.deletedAt).toISOString() : null,
    files: m.files.map((f) => ({
      kind: f.kind,
      path: f.path,
      sha256: f.sha256,
      size: f.size,
    })),
  };
}

// Upgrade one item folder from legacy `metadata.json` to `info.json` +
// `source.json`. Idempotent: a no-op once `info.json` exists. Path-based
// so it works for both `items/` and `trash/` entries.
export async function migrateItemDirToInfo(dir: string): Promise<boolean> {
  if (existsSync(join(dir, INFO_FILE))) return false;
  const legacyPath = join(dir, LEGACY_METADATA_FILE);
  if (!existsSync(legacyPath)) return false;

  let raw: unknown;
  try {
    raw = JSON.parse(await readFile(legacyPath, "utf8"));
  } catch (err) {
    log.warn("[pond migrate] unreadable metadata.json", dir, err);
    return false;
  }
  const id = basename(dir).replace(/\.info$/, "");
  const normalized = normalizeItemMetadata(id, raw);
  if (!normalized) {
    log.warn("[pond migrate] could not normalize metadata", dir);
    return false;
  }

  const info = infoDocFromMetadata(normalized);
  const published = extractPublishedAt(raw);
  if (published) info.publishedAt = published;

  await writeFile(join(dir, INFO_FILE), JSON.stringify(info, null, 2));
  await writeFile(
    join(dir, SOURCE_FILE),
    JSON.stringify(normalized.pond.rawSource ?? null, null, 2),
  );
  await rm(legacyPath, { force: true });
  return true;
}

function extractPublishedAt(raw: unknown): string | null {
  if (!raw || typeof raw !== "object") return null;
  const doc = raw as Record<string, unknown>;
  const pond = (doc.pond ?? {}) as Record<string, unknown>;
  const save = (pond.save ?? {}) as Record<string, unknown>;
  return toIso(
    (save.publishedAt as string | undefined) ??
      (doc.publishedAt as string | undefined) ??
      null,
  );
}

/* Legacy `metadata.json` came in two shapes:
 *  - Flat: fields like `source`, `url`, `name` live at the top level.
 *  - Schema 2: the serialized save row is nested under `pond.save`, with
 *    file and task manifests alongside it.
 *
 * Both collapse to the same in-memory `ItemMetadata` here so the scanner
 * (and the layout migration) sees one shape. Without the normalization,
 * every pipeline-finalized item makes `reconcileLibrary` insert
 * `source: undefined` and trip the NOT NULL constraint on every scan
 * tick. */
function normalizeItemMetadata(id: string, raw: unknown): ItemMetadata | null {
  if (!raw || typeof raw !== "object") return null;
  const doc = raw as Record<string, unknown>;
  const pond = (doc.pond ?? {}) as Record<string, unknown>;
  if (pond.schema === 2 && pond.save && typeof pond.save === "object") {
    return adaptSchema2(id, doc, pond);
  }
  return doc as unknown as ItemMetadata;
}

function adaptSchema2(
  id: string,
  doc: Record<string, unknown>,
  pond: Record<string, unknown>,
): ItemMetadata | null {
  const save = pond.save as Record<string, unknown>;
  const source = typeof save.source === "string" ? save.source : null;
  const sourceId = typeof save.sourceId === "string" ? save.sourceId : null;
  if (!source || !sourceId) return null;

  const files = Array.isArray(pond.files)
    ? (pond.files as Array<Record<string, unknown>>).map((f) => ({
        kind: String(f.kind ?? "other"),
        path: String(f.path ?? ""),
        sha256: String(f.sha256 ?? ""),
        size: Number(f.size ?? 0),
      }))
    : [];
  const parsedSavedAt = parseTimestamp(save.savedAt);
  const parsedCreatedAt = parseTimestamp(save.createdAt);
  const parsedDeletedAt = parseTimestamp(save.deletedAt);

  return {
    id,
    source,
    sourceId,
    url: typeof save.url === "string" ? save.url : "",
    name: typeof save.title === "string" ? save.title : null,
    annotation: typeof save.notes === "string" ? save.notes : "",
    tags: Array.isArray(save.tags) ? (save.tags as unknown[]).map(String) : [],
    folders: [],
    ext: files[0]?.path ? extname(files[0].path).slice(1) || null : null,
    size:
      typeof save.fileSize === "number"
        ? save.fileSize
        : (files[0]?.size ?? null),
    width: typeof save.width === "number" ? save.width : null,
    height: typeof save.height === "number" ? save.height : null,
    btime: parsedCreatedAt ?? Date.now(),
    mtime:
      typeof (doc.mtime as unknown) === "number"
        ? (doc.mtime as number)
        : Date.now(),
    importedAt: parsedSavedAt ?? Date.now(),
    isDeleted: parsedDeletedAt != null,
    deletedAt: parsedDeletedAt,
    files,
    pond: {
      schemaVersion: 2,
      rawSource: pond.rawSource,
      description:
        typeof save.description === "string" ? save.description : null,
      author: typeof save.author === "string" ? save.author : null,
      notes: typeof save.notes === "string" ? save.notes : null,
      mediaType: typeof save.mediaType === "string" ? save.mediaType : null,
      coverIndex: typeof save.coverIndex === "number" ? save.coverIndex : 0,
    },
  };
}

function parseTimestamp(value: unknown): number | null {
  if (value == null) return null;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const ms = Date.parse(value);
    return Number.isFinite(ms) ? ms : null;
  }
  return null;
}

// Trash is an in-place flag. The item folder always stays in `items/`;
// only `deletedAt` in info.json records the deleted state. Keeping files
// put means pond:// keeps resolving trashed media, and stamping the flag
// on disk lets it survive an index rebuild. Pass a Date to trash, `null`
// to restore. No-op when the item has no readable info folder.
export async function setItemDeleted(
  id: string,
  deletedAt: Date | null,
): Promise<void> {
  await applyItemPatch(id, { deletedAt });
}

export async function removeItem(id: string): Promise<void> {
  const path = itemDir(id);
  if (existsSync(path)) {
    await rm(path, { recursive: true, force: true });
  }
  const trashPath = join(resolvePaths().trashDir, `${id}.info`);
  if (existsSync(trashPath)) {
    await rm(trashPath, { recursive: true, force: true });
  }
}

export async function* scanLibrary(): AsyncGenerator<{
  id: string;
  mtimeMs: number;
  metadata: ItemMetadata | null;
}> {
  const paths = resolvePaths();
  let entries: string[] = [];
  try {
    entries = await readdir(paths.itemsDir);
  } catch {
    return;
  }
  for (const entry of entries) {
    if (!entry.endsWith(".info")) continue;
    const id = entry.slice(0, -".info".length);
    const dir = join(paths.itemsDir, entry);
    try {
      const info = await stat(dir);
      const metadata = await readItemMetadata(id);
      yield { id, mtimeMs: info.mtimeMs, metadata };
    } catch (err) {
      log.warn("[pond library] scan stat failed", id, err);
    }
  }
}
