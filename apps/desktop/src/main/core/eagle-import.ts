import type { Dirent } from "node:fs";
import { readdir, readFile, stat } from "node:fs/promises";
import { basename, join } from "node:path";
import type { ImageComment, VideoNote } from "@pond/schema/db";
import log from "electron-log/main.js";
import { ulid } from "ulid";
import { z } from "zod";
import { importFolderTree, setSaveFolders } from "./folders";
import { createManualSave, type ManualSaveInput } from "./manual-import";

interface EagleFolder {
  id?: string;
  name?: string;
  password?: string;
  color?: string;
  children?: EagleFolder[];
}

const EagleFolderSchema: z.ZodType<EagleFolder> = z.lazy(() =>
  z.object({
    id: z.string().optional().catch(undefined),
    name: z.string().optional().catch(undefined),
    password: z.string().optional().catch(undefined),
    color: z.string().optional().catch(undefined),
    children: z.array(EagleFolderSchema).optional().catch(undefined),
  }),
);

const EagleLibrarySchema = z.object({
  folders: z.array(EagleFolderSchema).optional().catch(undefined),
});

const EagleCommentSchema = z.object({
  id: z.string().optional().catch(undefined),
  x: z.number().optional().catch(undefined),
  y: z.number().optional().catch(undefined),
  width: z.number().optional().catch(undefined),
  height: z.number().optional().catch(undefined),
  w: z.number().optional().catch(undefined),
  h: z.number().optional().catch(undefined),
  annotation: z.string().optional().catch(undefined),
  text: z.string().optional().catch(undefined),
});

const EagleVideoMarkSchema = z.object({
  time: z.number().optional().catch(undefined),
  duration: z.number().optional().catch(undefined),
  text: z.string().optional().catch(undefined),
  annotation: z.string().optional().catch(undefined),
});

const EagleItemMetaSchema = z.object({
  id: z.string().optional().catch(undefined),
  name: z.string().optional().catch(undefined),
  tags: z.array(z.string()).optional().catch(undefined),
  folders: z.array(z.string()).optional().catch(undefined),
  url: z.string().optional().catch(undefined),
  annotation: z.string().optional().catch(undefined),
  width: z.number().optional().catch(undefined),
  height: z.number().optional().catch(undefined),
  isDeleted: z.boolean().optional().catch(undefined),
  star: z.number().optional().catch(undefined),
  palettes: z.array(z.string()).optional().catch(undefined),
  comments: z.array(EagleCommentSchema).optional().catch(undefined),
  videoMarks: z.array(EagleVideoMarkSchema).optional().catch(undefined),
  notes: z.array(EagleVideoMarkSchema).optional().catch(undefined),
});

export interface EagleLockedFolder {
  id: string;
  name: string;
}

export interface EagleImportResult {
  ok: boolean;
  imported: number;
  skipped: number;
  failed: number;
  deletedSkipped: number;
  lockedFolders: EagleLockedFolder[];
  droppedFields: string[];
  error?: string;
}

export interface FlattenedEagleFolder {
  id: string;
  name: string;
  parentId: string | null;
  color?: string | null;
  sortOrder: number;
}

export function partitionEagleItemFiles(files: readonly string[]) {
  const visible = files.filter(
    (name) => name !== "metadata.json" && !name.startsWith("."),
  );
  const thumbnail =
    visible.find((name) => name.toLowerCase().endsWith("_thumbnail.png")) ??
    null;
  return {
    mediaFiles: visible.filter((name) => name !== thumbnail),
    thumbnail,
  };
}

export function collectLockedEagleFolders(
  folders: EagleFolder[],
): EagleLockedFolder[] {
  const out: EagleLockedFolder[] = [];
  for (const folder of folders) {
    if (folder.password && folder.id) {
      out.push({
        id: folder.id,
        name: folder.name?.trim() || "Untitled",
      });
    }
    if (folder.children?.length) {
      out.push(...collectLockedEagleFolders(folder.children));
    }
  }
  return out;
}

export function flattenEagleFolders(
  folders: EagleFolder[],
  parentId: string | null = null,
): FlattenedEagleFolder[] {
  const out: FlattenedEagleFolder[] = [];
  for (const [sortOrder, folder] of folders.entries()) {
    if (!folder.id || folder.password) continue;
    out.push({
      id: folder.id,
      name: folder.name?.trim() || "Untitled",
      parentId,
      color: folder.color ?? null,
      sortOrder,
    });
    if (folder.children?.length) {
      out.push(...flattenEagleFolders(folder.children, folder.id));
    }
  }
  return out;
}

function mapComments(
  comments: z.infer<typeof EagleCommentSchema>[] | undefined,
): ImageComment[] {
  return (comments ?? [])
    .map((comment) => {
      const text = (comment.text ?? comment.annotation ?? "").trim();
      if (!text) return null;
      return {
        id: comment.id || ulid(),
        x: comment.x ?? 0,
        y: comment.y ?? 0,
        w: comment.w ?? comment.width ?? 0,
        h: comment.h ?? comment.height ?? 0,
        text,
      } satisfies ImageComment;
    })
    .filter((comment): comment is ImageComment => comment !== null);
}

function mapVideoNotes(
  marks: z.infer<typeof EagleVideoMarkSchema>[] | undefined,
): VideoNote[] {
  return (marks ?? [])
    .map((mark) => {
      const text = (mark.text ?? mark.annotation ?? "").trim();
      if (!text) return null;
      return {
        id: ulid(),
        timeSec: mark.time ?? mark.duration ?? 0,
        text,
      } satisfies VideoNote;
    })
    .filter((note): note is VideoNote => note !== null);
}

async function readJson<T>(
  path: string,
  schema: z.ZodType<T>,
): Promise<T | null> {
  let text: string;
  try {
    text = await readFile(path, "utf8");
  } catch (cause) {
    if (errnoCode(cause) !== "ENOENT") {
      log.warn("[pond eagle] failed to read json", path, cause);
    }
    return null;
  }
  const parsed = schema.safeParse(JSON.parse(text));
  return parsed.success ? parsed.data : null;
}

function errnoCode(cause: unknown): string | null {
  return cause instanceof Error && "code" in cause ? String(cause.code) : null;
}

async function resolveImagesDir(libraryPath: string): Promise<string | null> {
  const direct = join(libraryPath, "images");
  try {
    if ((await stat(direct)).isDirectory()) return direct;
  } catch {}

  try {
    const entries = await readdir(libraryPath, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory() || !entry.name.endsWith(".library")) continue;
      const nested = join(libraryPath, entry.name, "images");
      try {
        if ((await stat(nested)).isDirectory()) return nested;
      } catch {}
    }
  } catch {
    return null;
  }
  return null;
}

async function resolveLibraryMeta(
  libraryPath: string,
  imagesDir: string,
): Promise<{ folders: EagleFolder[] }> {
  for (const path of [
    join(libraryPath, "metadata.json"),
    join(imagesDir, "..", "metadata.json"),
  ]) {
    const doc = await readJson(path, EagleLibrarySchema);
    if (doc?.folders) return { folders: doc.folders };
  }
  return { folders: [] };
}

function emptyResult(error?: string): EagleImportResult {
  return {
    ok: false,
    imported: 0,
    skipped: 0,
    failed: 0,
    deletedSkipped: 0,
    lockedFolders: [],
    droppedFields: [],
    error,
  };
}

export async function dryRunEagleLibrary(
  libraryPath: string,
): Promise<EagleImportResult> {
  return importEagleLibrary(libraryPath, { dryRun: true });
}

export async function importEagleLibrary(
  libraryPath: string,
  opts: { dryRun?: boolean } = {},
): Promise<EagleImportResult> {
  const imagesDir = await resolveImagesDir(libraryPath);
  if (!imagesDir) return emptyResult("not_eagle_library");

  const libraryMeta = await resolveLibraryMeta(libraryPath, imagesDir);
  const lockedFolders = collectLockedEagleFolders(libraryMeta.folders);
  const mapped = opts.dryRun
    ? new Map<string, string>()
    : await importFolderTree(flattenEagleFolders(libraryMeta.folders));

  let imported = 0;
  let skipped = 0;
  let failed = 0;
  let deletedSkipped = 0;
  const dropped = new Set<string>();

  let entries: Dirent[];
  try {
    entries = await readdir(imagesDir, { withFileTypes: true });
  } catch (err) {
    log.warn("[pond eagle] readdir failed", imagesDir, err);
    return emptyResult("read_failed");
  }

  for (const entry of entries) {
    if (!entry.isDirectory() || !entry.name.endsWith(".info")) continue;
    const itemDir = join(imagesDir, entry.name);

    const meta = await readJson(
      join(itemDir, "metadata.json"),
      EagleItemMetaSchema,
    );
    if (!meta?.id) {
      failed += 1;
      continue;
    }
    if (meta.isDeleted) {
      deletedSkipped += 1;
      skipped += 1;
      continue;
    }

    let files: string[];
    try {
      files = await readdir(itemDir);
    } catch {
      failed += 1;
      continue;
    }

    const { mediaFiles, thumbnail } = partitionEagleItemFiles(files);
    if (mediaFiles.length === 0) {
      skipped += 1;
      continue;
    }

    const tags = [...(meta.tags ?? [])];
    const filePaths = mediaFiles.map((name) => join(itemDir, name));
    const comments = mapComments(meta.comments);
    const videoNotes = mapVideoNotes(meta.videoMarks ?? meta.notes);
    const palettes = (meta.palettes ?? []).filter(Boolean);

    if (opts.dryRun) {
      imported += 1;
      continue;
    }

    try {
      const input: ManualSaveInput = {
        title: meta.name?.trim() || basename(mediaFiles[0] ?? meta.id),
        url: meta.url?.trim() || null,
        note: meta.annotation?.trim() || null,
        tags,
        filePaths,
        customThumbnailPath: thumbnail ? join(itemDir, thumbnail) : null,
        sourceId: `eagle:${meta.id}`,
      };
      if (meta.width !== undefined) input.width = meta.width;
      if (meta.height !== undefined) input.height = meta.height;
      if (meta.star != null && meta.star > 0) input.rating = meta.star;
      if (comments.length > 0) input.comments = comments;
      if (videoNotes.length > 0) input.videoNotes = videoNotes;
      if (palettes.length > 0) input.dominantColors = palettes;
      const res = await createManualSave(input);
      if (!res.ok) {
        failed += 1;
        continue;
      }
      const pondFolderIds = (meta.folders ?? [])
        .map((id) => mapped.get(id))
        .filter((id): id is string => Boolean(id));
      if ((meta.folders ?? []).some((id) => !mapped.has(id))) {
        dropped.add("locked-folder membership");
      }
      if (res.id && pondFolderIds.length > 0) {
        await setSaveFolders(res.id, pondFolderIds);
      }
      if (res.skipped) skipped += 1;
      else imported += 1;
    } catch (err) {
      log.warn("[pond eagle] item import failed", meta.id, err);
      failed += 1;
    }
  }

  return {
    ok: imported > 0 || skipped > 0 || lockedFolders.length > 0,
    imported,
    skipped,
    failed,
    deletedSkipped,
    lockedFolders,
    droppedFields: [...dropped],
  };
}
