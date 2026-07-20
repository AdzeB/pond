import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { extname, join } from "node:path";
import {
  type NewSave,
  type Save,
  type SaveFile,
  saves,
  syncActions,
} from "@pond/schema/db";
import { eq } from "drizzle-orm";
import type { SQLiteColumn } from "drizzle-orm/sqlite-core";
import log from "electron-log/main.js";
import { ulid } from "ulid";
import { getDb } from "../../../db";
import { withRawSlim } from "../../../lib/raw-slim";
import { itemDir } from "../../../paths";
import { broadcastSyncAction } from "../../executor";

export interface WriteFileArgs {
  kind: SaveFile["kind"];
  filename: string;
  bytes: Buffer;
  mimeType?: string;
  width?: number;
  height?: number;
  /** Origin URL this file was downloaded from; persisted for smart per-URL skip. */
  sourceUrl?: string;
}

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
  /** Select only the columns this patch needs, not the whole row; avoids loading `raw_json` on every patch. */
  const cols: Record<string, SQLiteColumn> = {
    id: saves.id,
    files: saves.files,
  };
  const columnByKey = saves as unknown as Record<string, SQLiteColumn>;
  for (const key of Object.keys(patch)) {
    const col = columnByKey[key];
    if (col) cols[key] = col;
  }
  const rows = await db.select(cols).from(saves).where(eq(saves.id, saveId));
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
  /** Replaced kinds free their filenames, so regenerations overwrite in place instead of accumulating suffixed copies. */
  const baseFiles = replaceKinds
    ? (current.files ?? []).filter((f) => !replaceKinds.has(f.kind))
    : (current.files ?? []);

  const written: SaveFile[] = [];
  if (opts.newFiles && opts.newFiles.length > 0) {
    const dir = itemDir(saveId);
    if (!existsSync(dir)) await mkdir(dir, { recursive: true });
    for (const file of opts.newFiles) {
      if (file.bytes.byteLength === 0) {
        log.warn(
          "[pond pipeline] applySavePatch: empty file skipped",
          saveId,
          file.filename,
        );
        continue;
      }
      const target = uniqueFilename(file.filename, baseFiles, written);
      await writeFile(join(dir, target), file.bytes);
      const entry: SaveFile = {
        kind: file.kind,
        path: target,
        sha256: createHash("sha256").update(file.bytes).digest("hex"),
        size: file.bytes.byteLength,
        ...(file.mimeType ? { mimeType: file.mimeType } : {}),
        ...(file.width ? { width: file.width } : {}),
        ...(file.height ? { height: file.height } : {}),
        ...(file.sourceUrl ? { sourceUrl: file.sourceUrl } : {}),
      };
      written.push(entry);
    }
  }
  const nextFiles =
    written.length > 0 ? [...baseFiles, ...written] : current.files;

  const fullPatch: Partial<NewSave> = {
    ...patch,
    ...(written.length > 0 ? { files: nextFiles } : {}),
  };

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
      data: fullPatch as unknown,
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

export async function readSave(saveId: string): Promise<Save | null> {
  const db = await getDb();
  const rows = await db.select().from(saves).where(eq(saves.id, saveId));
  return rows[0] ?? null;
}

function pickPrev(current: Partial<Save>, patch: Partial<NewSave>): unknown {
  const prev: Record<string, unknown> = {};
  for (const key of Object.keys(patch)) {
    prev[key] = (current as Record<string, unknown>)[key];
  }
  return prev;
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
