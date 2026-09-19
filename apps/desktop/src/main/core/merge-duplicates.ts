import { realpath } from "node:fs/promises";
import { basename, relative, resolve, sep } from "node:path";
import { type Save, saves } from "@pond/schema/db";
import { labelKey } from "@pond/schema/label-name";
import type { Transaction, TxMeta } from "@pond/schema/tx";
import { inArray } from "drizzle-orm";
import { ulid } from "ulid";
import { z } from "zod";
import { getDb } from "../db";
import { writeSaveInfo } from "../lib/library";
import { itemDir } from "../paths";
import { executeBatch } from "./executor";
import { copyExportFile } from "./export-files";
import { folderIdsForSave, setSaveFolders } from "./folders";
import { runLibraryTransfer } from "./library-transfers";

type MergeSave = Pick<
  Save,
  "id" | "tags" | "comments" | "videoNotes" | "files" | "fileSize" | "deletedAt"
>;

export interface DuplicateMergeRuntime {
  read(ids: string[]): Promise<MergeSave[]>;
  directory(id: string): string;
  folders(id: string): Promise<string[]>;
  setFolders(id: string, ids: string[]): Promise<{ ok: boolean }>;
  commit(transactions: Transaction[]): Promise<void>;
}

const runtime: DuplicateMergeRuntime = {
  async read(ids) {
    return (await getDb()).select().from(saves).where(inArray(saves.id, ids));
  },
  directory: itemDir,
  folders: folderIdsForSave,
  async setFolders(id, ids) {
    const result = await setSaveFolders(id, ids);
    if (!result.ok) return result;
    const [updated] = await (await getDb())
      .select()
      .from(saves)
      .where(inArray(saves.id, [id]));
    if (!updated) throw new Error("The survivor no longer exists.");
    await writeSaveInfo(updated);
    return result;
  },
  async commit(transactions) {
    await executeBatch(transactions);
  },
};

function uniqueAnnotations<T extends { id: string }>(
  values: T[],
  key: (value: T) => string,
): T[] {
  const seen = new Set<string>();
  const ids = new Set<string>();
  const result: T[] = [];
  for (const value of values) {
    const identity = key(value);
    if (seen.has(identity)) continue;
    seen.add(identity);
    const id = ids.has(value.id) ? ulid() : value.id;
    ids.add(id);
    result.push({ ...value, id });
  }
  return result;
}

interface DuplicateMergeInput {
  keepId: string;
  ids: readonly string[];
  meta?: TxMeta;
}

const mergeMetadataSchema = z.object({
  tags: z.array(z.string()),
  comments: z.array(
    z.object({
      id: z.string(),
      fileIndex: z.number().int().nonnegative().optional(),
      x: z.number(),
      y: z.number(),
      w: z.number(),
      h: z.number(),
      text: z.string(),
      createdAt: z.number().optional(),
    }),
  ),
  videoNotes: z.array(
    z.object({
      id: z.string(),
      fileIndex: z.number().int().nonnegative().optional(),
      timeSec: z.number(),
      text: z.string(),
    }),
  ),
  files: z.array(
    z.object({
      kind: z.string(),
      path: z.string(),
      sha256: z.string(),
      size: z.number(),
      mimeType: z.string().nullable().optional(),
      width: z.number().nullable().optional(),
      height: z.number().nullable().optional(),
      sourceUrl: z.string().nullable().optional(),
    }),
  ),
  fileSize: z.number().nullable(),
});

export const duplicateMergeReceiptSchema = z.object({
  keepId: z.string(),
  ids: z.array(z.string()),
  before: mergeMetadataSchema,
  after: mergeMetadataSchema,
  foldersBefore: z.array(z.string()),
  foldersAfter: z.array(z.string()),
});

async function restoreDuplicateMerge(
  receipt: z.infer<typeof duplicateMergeReceiptSchema>,
  dependencies: DuplicateMergeRuntime = runtime,
) {
  const rows = await dependencies.read([receipt.keepId, ...receipt.ids]);
  const keep = rows.find((save) => save.id === receipt.keepId);
  if (
    !keep ||
    keep.deletedAt ||
    rows.length !== receipt.ids.length + 1 ||
    rows.some((save) => save.id !== receipt.keepId && !save.deletedAt)
  )
    throw new Error("The merged Saves changed since this action.");
  const current = mergeMetadataSchema.parse(keep);
  const currentFolders = await dependencies.folders(keep.id);
  if (
    JSON.stringify(current) !==
      JSON.stringify(mergeMetadataSchema.parse(receipt.after)) ||
    JSON.stringify([...currentFolders].sort()) !==
      JSON.stringify([...receipt.foldersAfter].sort())
  )
    throw new Error(
      "The survivor was edited after merging. Restore the duplicates from Trash instead.",
    );
  const meta: TxMeta = { actor: "agent", actorReason: "assistant:undo-merge" };
  await dependencies.commit([
    {
      kind: "update",
      model: "save",
      id: keep.id,
      patch: receipt.before,
      before: receipt.after,
      meta,
    },
  ]);
  if (!(await dependencies.setFolders(keep.id, receipt.foldersBefore)).ok)
    throw new Error("Could not restore the survivor's folders.");
  await dependencies.commit(
    receipt.ids.map((id) => ({ kind: "untrash", model: "save", id, meta })),
  );
}

const mergeQueues = new WeakMap<DuplicateMergeRuntime, Promise<void>>();

async function mergeSaves(
  input: DuplicateMergeInput,
  dependencies: DuplicateMergeRuntime = runtime,
) {
  const prior = mergeQueues.get(dependencies) ?? Promise.resolve();
  const operation = prior.then(() => preserveDuplicates(input, dependencies));
  const settled = operation.then(
    () => {},
    () => {},
  );
  mergeQueues.set(dependencies, settled);
  try {
    return await operation;
  } finally {
    if (mergeQueues.get(dependencies) === settled)
      mergeQueues.delete(dependencies);
  }
}

async function preserveDuplicates(
  input: DuplicateMergeInput,
  dependencies: DuplicateMergeRuntime,
) {
  const keepId = input.keepId.trim();
  const ids = [...new Set(input.ids.filter((id) => id && id !== keepId))];
  if (!keepId || ids.length === 0) return { ok: false, trashed: 0 };
  const rows = await dependencies.read([keepId, ...ids]);
  const byId = new Map(rows.map((save) => [save.id, save]));
  const keep = byId.get(keepId);
  if (
    !keep ||
    keep.deletedAt ||
    rows.length !== ids.length + 1 ||
    rows.some((save) => save.deletedAt)
  ) {
    throw new Error(
      "Select an existing survivor and duplicates outside Trash.",
    );
  }
  const extras = ids.map((id) => {
    const save = byId.get(id);
    if (!save) throw new Error("A duplicate no longer exists.");
    return save;
  });
  const ordered = [keep, ...extras];
  const tags: string[] = [];
  const tagKeys = new Set<string>();
  for (const tag of ordered.flatMap((save) => save.tags ?? [])) {
    const key = labelKey(tag);
    if (!key || tagKeys.has(key)) continue;
    tagKeys.add(key);
    tags.push(tag);
  }
  const memberships = await Promise.all(
    ordered.map((save) => dependencies.folders(save.id)),
  );
  const folderIds = [...new Set(memberships.flat())];
  const files = [...keep.files];
  const attachmentMap = new Map<string, Map<number, number>>([
    [keep.id, new Map(keep.files.map((_, index) => [index, index]))],
  ]);
  const target = await realpath(dependencies.directory(keepId));
  for (const extra of extras) {
    const sourceRoot = await realpath(dependencies.directory(extra.id));
    const indexes = new Map<number, number>();
    attachmentMap.set(extra.id, indexes);
    for (const [index, file] of extra.files.entries()) {
      const existing = file.sha256
        ? files.findIndex((candidate) => candidate.sha256 === file.sha256)
        : -1;
      if (existing >= 0) {
        indexes.set(index, existing);
        continue;
      }
      const source = await realpath(resolve(sourceRoot, file.path));
      if (!source.startsWith(`${sourceRoot}${sep}`))
        throw new Error("A duplicate file resolves outside its Save.");
      const copied = await copyExportFile(source, target, basename(file.path));
      indexes.set(index, files.length);
      files.push({ ...file, path: relative(target, copied) });
    }
  }
  function remapAnnotation<T extends { fileIndex?: number }>(
    annotation: T,
    saveId: string,
  ): T {
    const mapped = attachmentMap.get(saveId)?.get(annotation.fileIndex ?? 0);
    return mapped === undefined ||
      (mapped === 0 && annotation.fileIndex === undefined)
      ? annotation
      : { ...annotation, fileIndex: mapped };
  }
  const comments = uniqueAnnotations(
    ordered.flatMap((save) =>
      (save.comments ?? []).map((comment) => remapAnnotation(comment, save.id)),
    ),
    (comment) =>
      JSON.stringify([
        comment.fileIndex ?? 0,
        comment.x,
        comment.y,
        comment.w,
        comment.h,
        comment.text,
      ]),
  );
  const videoNotes = uniqueAnnotations(
    ordered.flatMap((save) =>
      (save.videoNotes ?? []).map((note) => remapAnnotation(note, save.id)),
    ),
    (note) => JSON.stringify([note.fileIndex ?? 0, note.timeSec, note.text]),
  );
  const meta: TxMeta = {
    actor: "user",
    actorReason: "merge-duplicates",
    ...input.meta,
  };
  const before = mergeMetadataSchema.parse(keep);
  const after = {
    tags,
    comments,
    videoNotes,
    files,
    fileSize: files.reduce((size, file) => size + file.size, 0),
  };
  await dependencies.commit([
    {
      kind: "update",
      model: "save",
      id: keepId,
      patch: {
        tags,
        comments,
        videoNotes,
        files,
        fileSize: files.reduce((size, file) => size + file.size, 0),
      },
      before: {
        tags: keep.tags,
        comments: keep.comments,
        videoNotes: keep.videoNotes,
        files: keep.files,
        fileSize: keep.fileSize,
      },
      meta,
    },
  ]);
  const assigned = await dependencies.setFolders(keepId, folderIds);
  if (!assigned.ok)
    throw new Error("Could not preserve the duplicates' folders.");
  await dependencies.commit(
    ids.map((id) => ({ kind: "trash", model: "save", id, meta })),
  );
  return {
    ok: true,
    trashed: ids.length,
    receipt: {
      keepId,
      ids,
      before,
      after,
      foldersBefore: memberships[0] ?? [],
      foldersAfter: folderIds,
    },
  };
}

export function mergeDuplicateSaves(
  input: DuplicateMergeInput,
  dependencies: DuplicateMergeRuntime = runtime,
) {
  return runLibraryTransfer(() => mergeSaves(input, dependencies));
}
export function undoDuplicateMerge(
  receipt: z.infer<typeof duplicateMergeReceiptSchema>,
  dependencies: DuplicateMergeRuntime = runtime,
) {
  return runLibraryTransfer(async () => {
    const prior = mergeQueues.get(dependencies) ?? Promise.resolve();
    const operation = prior.then(() =>
      restoreDuplicateMerge(receipt, dependencies),
    );
    const settled = operation.then(
      () => {},
      () => {},
    );
    mergeQueues.set(dependencies, settled);
    try {
      return await operation;
    } finally {
      if (mergeQueues.get(dependencies) === settled)
        mergeQueues.delete(dependencies);
    }
  });
}
