import { createHash } from "node:crypto";
import { createReadStream, existsSync } from "node:fs";
import { copyFile, mkdir, rm, stat, writeFile } from "node:fs/promises";
import { extname, join } from "node:path";
import {
  type NewSave,
  type Save,
  type SaveFile,
  saves,
  syncActions,
} from "@pond/schema/db";
import { eq, getTableColumns } from "drizzle-orm";
import log from "electron-log/main.js";
import { ulid } from "ulid";
import { getDb } from "../../../db";
import { withRawSlim } from "../../../lib/raw-slim";
import { itemDir } from "../../../paths";
import { broadcastSyncAction } from "../../executor";

interface WriteFileMetadata {
  kind: SaveFile["kind"];
  filename: string;
  mimeType?: string;
  width?: number;
  height?: number;
  sourceUrl?: string;
}

export type WriteFileArgs = WriteFileMetadata &
  (
    | { bytes: Buffer; sourcePath?: never }
    | { bytes?: never; sourcePath: string }
  );

interface ApplyPatchOptions {
  actorReason: string;
  newFiles?: WriteFileArgs[];
  replaceFilesWithKind?: SaveFile["kind"] | SaveFile["kind"][];
}

export async function applySavePatch(
  saveId: string,
  patch: Partial<NewSave>,
  opts: ApplyPatchOptions,
): Promise<Save | null> {
  const db = await getDb();
  const wanted = new Set(["id", "files", ...Object.keys(patch)]);
  const selection = Object.fromEntries(
    Object.entries(getTableColumns(saves)).filter(([key]) => wanted.has(key)),
  );
  const rows = await db
    .select(selection)
    .from(saves)
    .where(eq(saves.id, saveId));
  // SAFETY: the selection is built from the saves table's own columns, so every key on
  // the returned row is a Save key holding that column's value.
  const current = rows[0] as Partial<Save> | undefined;
  if (!current) {
    log.warn("[pond pipeline] applySavePatch: save vanished", saveId);
    return null;
  }

  const replaceKinds =
    opts.replaceFilesWithKind == null
      ? null
      : new Set<SaveFile["kind"]>(
          Array.isArray(opts.replaceFilesWithKind)
            ? opts.replaceFilesWithKind
            : [opts.replaceFilesWithKind],
        );
  const baseFiles = replaceKinds
    ? (current.files ?? []).filter((f) => !replaceKinds.has(f.kind))
    : (current.files ?? []);

  const written: SaveFile[] = [];
  if (opts.newFiles && opts.newFiles.length > 0) {
    const dir = itemDir(saveId);
    if (!existsSync(dir)) await mkdir(dir, { recursive: true });
    for (const file of opts.newFiles) {
      const target = uniqueFilename(file.filename, baseFiles, written);
      const targetPath = join(dir, target);
      const details = await persistWriteFile(file, targetPath);
      if (!details) {
        log.warn(
          "[pond pipeline] applySavePatch: empty file skipped",
          saveId,
          file.filename,
        );
        continue;
      }
      const entry: SaveFile = {
        kind: file.kind,
        path: target,
        sha256: details.sha256,
        size: details.size,
      };
      if (file.mimeType) entry.mimeType = file.mimeType;
      if (file.width) entry.width = file.width;
      if (file.height) entry.height = file.height;
      if (file.sourceUrl) entry.sourceUrl = file.sourceUrl;
      written.push(entry);
    }
  }
  const nextFiles =
    written.length > 0 ? [...baseFiles, ...written] : current.files;

  const fullPatch: Partial<NewSave> = { ...patch };
  if (written.length > 0) fullPatch.files = nextFiles;

  db.update(saves)
    .set(withRawSlim(fullPatch))
    .where(eq(saves.id, saveId))
    .run();
  const updated = (
    await db.select().from(saves).where(eq(saves.id, saveId))
  )[0];
  if (!updated) return null;

  const inserted = db
    .insert(syncActions)
    .values({
      modelName: "save",
      modelId: saveId,
      action: "U",
      data: fullPatch,
      prevData: pickPrev(current, fullPatch),
      actor: "system",
      actorReason: opts.actorReason,
      batchId: ulid(),
    })
    .returning()
    .all()[0];
  if (inserted) broadcastSyncAction(inserted);

  return updated;
}

export async function persistWriteFile(
  file: WriteFileArgs,
  targetPath: string,
): Promise<{ sha256: string; size: number } | null> {
  if (file.bytes) {
    if (file.bytes.byteLength === 0) return null;
    await writeFile(targetPath, file.bytes);
    return {
      sha256: createHash("sha256").update(file.bytes).digest("hex"),
      size: file.bytes.byteLength,
    };
  }

  await copyFile(file.sourcePath, targetPath);
  const { size } = await stat(targetPath);
  if (size === 0) {
    await rm(targetPath, { force: true });
    return null;
  }
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(targetPath)) hash.update(chunk);
  return { sha256: hash.digest("hex"), size };
}

export async function readSave(saveId: string): Promise<Save | null> {
  const db = await getDb();
  const rows = await db.select().from(saves).where(eq(saves.id, saveId));
  return rows[0] ?? null;
}

function pickPrev(
  current: Partial<Save>,
  patch: Partial<NewSave>,
): Partial<Save> {
  const keys = new Set(Object.keys(patch));
  return Object.fromEntries(
    Object.entries(current).filter(([key]) => keys.has(key)),
  );
}

function uniqueFilename(
  desired: string,
  existing: ReadonlyArray<SaveFile>,
  pending: ReadonlyArray<SaveFile>,
): string {
  const taken = new Set<string>();
  for (const f of existing) taken.add(f.path);
  for (const f of pending) taken.add(f.path);
  if (!taken.has(desired)) return desired;
  const ext = extname(desired);
  const base = desired.slice(0, desired.length - ext.length);
  for (let i = 1; i < 100; i++) {
    const candidate = `${base}-${i}${ext}`;
    if (!taken.has(candidate)) return candidate;
  }
  return `${base}-${Date.now()}${ext}`;
}
