import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import {
  mkdir,
  readdir,
  readFile,
  rm,
  stat,
  unlink,
  writeFile,
} from "node:fs/promises";
import { extname, join } from "node:path";
import {
  MEDIA_TYPES,
  type MediaType,
  type Save,
  SOURCES,
  type Source,
} from "@pond/schema/db";
import type { RawJson } from "@pond/schema/raw";
import { StoredRawJsonSchema, storedAsRawJson } from "@pond/schema/raw-schema";
import type { TxSaveFile } from "@pond/schema/tx";
import { inferKindFromFilename } from "@shared/save-file-names";
import log from "electron-log/main.js";
import { itemDir, itemFile, resolvePaths } from "../paths";
import type { SaveUserData } from "./library-format";
import {
  applyPatchToInfo,
  INFO_FILE,
  type InfoDoc,
  type InfoFile,
  infoDocFromSave,
  infoFilesFromSave,
  SOURCE_FILE,
  type StoredInfoDoc,
  StoredInfoDocSchema,
} from "./library-format";

interface ItemMetadata {
  id: string;
  source: Source;
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
  files: InfoFile[];
  pond: {
    schemaVersion: number;
    userData?: SaveUserData;
    publishedAt?: number | null;
    rawSource?: RawJson | null;
    description?: string | null;
    author?: string | null;
    notes?: string | null;
    mediaType?: MediaType | null;
    coverIndex?: number;
  };
}

function sha256(bytes: Buffer): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function decodeFile(file: TxSaveFile) {
  const buf = Buffer.isBuffer(file.bytes)
    ? file.bytes
    : Buffer.from(file.bytes);
  return { filename: file.filename, buf };
}

async function writeInfoFiles(
  id: string,
  info: InfoDoc,
  rawSource: RawJson | null | undefined,
): Promise<void> {
  const dir = itemDir(id);
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, INFO_FILE), JSON.stringify(info, null, 2));
  const sourcePath = join(dir, SOURCE_FILE);
  if (rawSource == null) {
    await unlink(sourcePath).catch(() => {});
  } else {
    await writeFile(sourcePath, JSON.stringify(rawSource, null, 2));
  }
}

export function mergeWrittenFiles(
  files: InfoFile[],
  written: Array<{ filename: string; buf: Buffer }>,
): InfoFile[] {
  const entries = new Map(files.map((file) => [file.path, file]));
  for (const file of written)
    entries.set(file.filename, {
      kind: inferKindFromFilename(file.filename),
      ...entries.get(file.filename),
      path: file.filename,
      sha256: sha256(file.buf),
      size: file.buf.length,
    });
  return [...entries.values()];
}

export async function writeSaveInfo(save: Save): Promise<void> {
  const manifest = infoFilesFromSave(save.files ?? []);
  const { folderIdsForSave } = await import("../core/folder-memberships");
  const folderIds = await folderIdsForSave(save.id);
  await writeInfoFiles(
    save.id,
    infoDocFromSave(save, manifest, folderIds),
    save.rawJson,
  );
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

  const manifest = mergeWrittenFiles(
    infoFilesFromSave(save.files ?? []),
    decoded,
  );
  const { folderIdsForSave } = await import("../core/folder-memberships");
  const folderIds = await folderIdsForSave(id);
  await writeInfoFiles(
    id,
    infoDocFromSave(save, manifest, folderIds),
    save.rawJson,
  );
  return { written: decoded };
}

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
    next.files = mergeWrittenFiles(next.files, decoded);
  }

  const rawSource =
    patch.rawJson !== undefined ? patch.rawJson : current.rawSource;
  await writeInfoFiles(id, next, rawSource);
  return true;
}

export async function readItemMetadata(
  id: string,
  root?: string,
): Promise<ItemMetadata | null> {
  const infoPath = root
    ? join(root, "items", `${id}.info`, INFO_FILE)
    : itemFile(id, INFO_FILE);
  if (!existsSync(infoPath)) return null;
  try {
    const info = StoredInfoDocSchema.parse(
      JSON.parse(await readFile(infoPath, "utf8")),
    );
    return metadataFromInfo(id, info, await readSourceDoc(id, root));
  } catch (err) {
    log.warn("[pond library] corrupt info.json", id, err);
    return null;
  }
}

async function readSourceDoc(
  id: string,
  root?: string,
): Promise<RawJson | null> {
  const path = root
    ? join(root, "items", `${id}.info`, SOURCE_FILE)
    : itemFile(id, SOURCE_FILE);
  if (!existsSync(path)) return null;
  let text: string;
  try {
    text = await readFile(path, "utf8");
  } catch {
    return null;
  }
  const decoded: unknown = JSON.parse(text);
  if (decoded == null) return null;
  const parsed = StoredRawJsonSchema.safeParse(decoded);
  if (!parsed.success) {
    log.warn("[pond library] corrupt source.json", id, parsed.error.message);
    return null;
  }
  return storedAsRawJson(parsed.data);
}

async function readInfoForEdit(
  id: string,
): Promise<{ info: StoredInfoDoc; rawSource: RawJson | null } | null> {
  const infoPath = itemFile(id, INFO_FILE);
  if (!existsSync(infoPath)) return null;
  try {
    const info = StoredInfoDocSchema.parse(
      JSON.parse(await readFile(infoPath, "utf8")),
    );
    return { info, rawSource: await readSourceDoc(id) };
  } catch (err) {
    log.warn("[pond library] corrupt info.json", id, err);
    return null;
  }
}

function metadataFromInfo(
  id: string,
  info: StoredInfoDoc,
  rawSource: RawJson | null,
): ItemMetadata {
  const files = info.files;
  const coverFile = files[info.coverIndex] ?? files[0];
  const createdMs = parseTimestamp(info.createdAt);
  const savedMs = parseTimestamp(info.savedAt);
  const deletedMs = parseTimestamp(info.deletedAt);
  return {
    id,
    source: toSource(info.source),
    sourceId: info.sourceId,
    url: info.url,
    name: info.title ?? null,
    annotation: info.notes ?? "",
    tags: info.tags,
    folders: info.folderIds,
    ext: files[0]?.path ? extname(files[0].path).slice(1) || null : null,
    size: coverFile?.size ?? null,
    width: info.width,
    height: info.height,
    btime: createdMs ?? Date.now(),
    mtime: savedMs ?? createdMs ?? Date.now(),
    importedAt: savedMs ?? Date.now(),
    isDeleted: deletedMs != null,
    deletedAt: deletedMs,
    files,
    pond: {
      schemaVersion: info.schema ?? 3,
      userData: info.userData,
      publishedAt: parseTimestamp(info.publishedAt),
      rawSource,
      description: info.description ?? null,
      author: info.author ?? null,
      notes: info.notes ?? null,
      mediaType: toMediaType(info.mediaType),
      coverIndex: info.coverIndex,
    },
  };
}

function parseTimestamp(value: string | null): number | null {
  if (value === null) return null;
  const ms = Date.parse(value);
  return Number.isFinite(ms) ? ms : null;
}

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

export async function* scanLibrary(root?: string): AsyncGenerator<{
  id: string;
  mtimeMs: number;
}> {
  const itemsDir = root ? join(root, "items") : resolvePaths().itemsDir;
  let entries: string[] = [];
  try {
    entries = await readdir(itemsDir);
  } catch {
    return;
  }
  for (const entry of entries) {
    if (!entry.endsWith(".info")) continue;
    const id = entry.slice(0, -".info".length);
    const dir = join(itemsDir, entry);
    try {
      const info = await stat(join(dir, INFO_FILE));
      yield { id, mtimeMs: info.mtimeMs };
    } catch (err) {
      log.warn("[pond library] scan stat failed", id, err);
    }
  }
}

function toSource(value: string): Source {
  return SOURCES.find((source) => source === value) ?? "web";
}

function toMediaType(value: string | null): MediaType | null {
  return MEDIA_TYPES.find((type) => type === value) ?? null;
}
