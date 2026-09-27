import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import { saves } from "@pond/schema/db";
import type { Transaction } from "@pond/schema/tx";
import { classifyLibraryFile } from "@shared/file-format";
import { decodeTextBytes } from "@shared/text-encoding";
import { eq, isNotNull, isNull } from "drizzle-orm";
import { z } from "zod";
import { duplicateGroups } from "../../core/duplicate-groups";
import { executeBatch } from "../../core/executor";
import { extractImageMetadata } from "../../core/image-metadata";
import { extractMediaMetadata } from "../../core/media-metadata";
import { mergeDuplicateSaves } from "../../core/merge-duplicates";
import { persistSave } from "../../core/persist-save";
import { retryFailedSaves } from "../../core/pipeline/enqueue";
import { skipSaves } from "../../core/pipeline/reconciler-client";
import { runEnsurePoster } from "../../core/pipeline/workers/ensure-poster";
import { runRenderTextCover } from "../../core/pipeline/workers/render-text-cover";
import { replaceSaveFile } from "../../core/replace-file";
import {
  readLibraryMedia,
  withDecryptedLibraryMediaPath,
} from "../../core/storage/library-media-storage";
import { recordForUndo } from "../../core/undo";
import { parseJsonVector, upsertVec } from "../../core/vec-index";
import { getDb } from "../../db";
import { itemFile } from "../../paths";
import {
  FlagParam,
  NullableStringParam,
  type QueryHandlerMap,
  query,
  StringListParam,
  StringParam,
} from "./params";

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
    sensitiveScore: z.number().min(0).max(1).nullable().optional(),
    sensitiveModel: z.string().nullable().optional(),
    autoTitleModel: z.string().nullable().optional(),
    suggestedTags: z.array(z.string()).nullable().optional(),
    suggestedTagsModel: z.string().nullable().optional(),
  })
  .catch({});

async function analyzeSaveColors(
  row: typeof saves.$inferSelect,
  force: boolean,
): Promise<boolean> {
  const { extractPalette } = await import("../../lib/palette");
  const { encodeBlurhash, pickBlurhashStill } = await import(
    "../../lib/blurhash"
  );
  const { encodePhash } = await import("../../lib/phash");
  const { itemFile } = await import("../../paths");
  const still = pickBlurhashStill(row);
  if (!still) return false;
  const needsColors =
    row.mediaType === "image" &&
    (force || (row.dominantColors ?? []).length === 0);
  const needsHash = force || !row.blurhash;
  const needsPerceptualHash =
    row.mediaType === "image" && (force || !row.phash);
  if (!needsColors && !needsHash && !needsPerceptualHash) return false;
  const patch = await withDecryptedLibraryMediaPath(
    itemFile(row.id, still.path),
    async (path): Promise<Parameters<typeof persistSave>[1]> => {
      const next: Parameters<typeof persistSave>[1] = {};
      if (needsColors) {
        const colors = await extractPalette(path);
        if (colors.length > 0) next.dominantColors = colors;
      }
      if (needsHash) {
        const hash = await encodeBlurhash(path);
        if (hash) next.blurhash = hash;
      }
      if (needsPerceptualHash) {
        const hash = await encodePhash(path);
        if (hash) next.phash = hash;
      }
      return next;
    },
  );
  if (Object.keys(patch).length === 0) return false;
  await persistSave(row.id, patch, {
    actorReason: force ? "color:reanalyze" : "color:backfill",
  });
  return true;
}

async function analyzeSaveMetadata(
  row: typeof saves.$inferSelect,
  force: boolean,
): Promise<boolean> {
  const file = row.files.find((entry) => {
    const mediaType = classifyLibraryFile(entry.path, entry.mimeType).mediaType;
    return ["image", "video", "audio"].includes(mediaType);
  });
  if (!file) return false;
  const mediaType = classifyLibraryFile(file.path, file.mimeType).mediaType;
  if (!force && row.metadataVersion === 1) return false;
  const metadata = await withDecryptedLibraryMediaPath(
    itemFile(row.id, file.path),
    (path) =>
      mediaType === "image"
        ? extractImageMetadata(path)
        : extractMediaMetadata(path),
  );
  if (Object.keys(metadata).length === 0) return false;
  await persistSave(
    row.id,
    { ...metadata, metadataVersion: 1 },
    {
      actorReason: force ? "metadata:reanalyze" : "metadata:backfill",
    },
  );
  return true;
}

export const savesMutationQueries = {
  "saves.batchEditExtension": query(
    z.object({
      ids: z.array(StringParam).min(1).max(100_000),
      extension: z.string().trim().min(1).max(16),
    }),
    async (params) => {
      const { batchEditExtensions } = await import(
        "../../core/batch-extensions"
      );
      return batchEditExtensions(params);
    },
  ),
  async "saves.emptyTrash"() {
    const db = await getDb();
    const rows = await db
      .select()
      .from(saves)
      .where(isNotNull(saves.deletedAt));
    if (rows.length === 0) return { ok: true, count: 0 };
    const txs: Transaction[] = rows.map((row) => ({
      kind: "purge",
      model: "save",
      id: row.id,
      before: row,
      meta: { actor: "user", actorReason: "empty-trash" },
    }));
    await executeBatch(txs);
    for (const transaction of txs) recordForUndo(transaction);
    return { ok: true, count: txs.length };
  },

  async "saves.restoreAll"() {
    const db = await getDb();
    const rows = await db
      .select({ id: saves.id })
      .from(saves)
      .where(isNotNull(saves.deletedAt));
    if (rows.length === 0) return { ok: true, count: 0 };
    const txs: Transaction[] = rows.map((row) => ({
      kind: "untrash",
      model: "save",
      id: row.id,
      meta: { actor: "user", actorReason: "restore-all" },
    }));
    await executeBatch(txs);
    for (const transaction of txs) recordForUndo(transaction);
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

  "saves.skipIngest": query(
    z.object({
      ids: z.array(z.coerce.string()).min(1),
    }),
    async (params) => {
      const skipped = await skipSaves(params.ids.filter(Boolean));
      return { ok: true as const, skipped };
    },
  ),

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

  "saves.patchDerived": query(
    z.object({ id: StringParam, patch: DerivedPatchSchema }),
    async (params) => {
      if (!params.id) return { ok: false as const };
      if (Object.keys(params.patch).length === 0) return { ok: false as const };
      const updated = await persistSave(params.id, params.patch, {
        actorReason: "enrichment:derived",
      });
      if (!updated) return { ok: false as const };
      if (params.patch.clipEmbedding) {
        const db = await getDb();
        const vector = parseJsonVector(params.patch.clipEmbedding);
        if (vector) upsertVec(db.$raw, "clip", params.id, vector);
      }
      return { ok: true as const };
    },
  ),

  async "saves.backfillColors"() {
    const db = await getDb();
    const rows = await db.select().from(saves);

    let updated = 0;
    for (const row of rows) if (await analyzeSaveColors(row, false)) updated++;
    return { ok: true, updated };
  },

  async "saves.backfillMetadata"() {
    const db = await getDb();
    const rows = await db.select().from(saves);
    let updated = 0;
    for (const row of rows)
      if (await analyzeSaveMetadata(row, false)) updated++;
    return { ok: true, updated };
  },

  "saves.reanalyzeColors": query(
    z.object({ id: StringParam }),
    async ({ id }) => {
      const db = await getDb();
      const row = db.select().from(saves).where(eq(saves.id, id)).get();
      if (!row) return { ok: false, updated: false };
      const updated = await analyzeSaveColors(row, true);
      return { ok: updated, updated };
    },
  ),

  "saves.setPrimaryColor": query(
    z.object({
      id: StringParam,
      color: z
        .string()
        .regex(/^#[0-9a-f]{6}$/i)
        .nullable(),
    }),
    async ({ id, color }) => {
      const db = await getDb();
      const row = db.select().from(saves).where(eq(saves.id, id)).get();
      if (!row) return { ok: false as const };
      const primaryColor = color?.toLowerCase() ?? null;
      if (
        primaryColor &&
        !(row.dominantColors ?? []).some(
          (candidate) => candidate.toLowerCase() === primaryColor,
        )
      )
        return { ok: false as const };
      await persistSave(
        id,
        { primaryColor },
        { actorReason: "color:set-primary" },
      );
      return { ok: true as const };
    },
  ),

  "saves.convertTextEncoding": query(
    z.object({ id: StringParam, fileIndex: z.number().int().nonnegative() }),
    async ({ id, fileIndex }) => {
      const db = await getDb();
      const row = db.select().from(saves).where(eq(saves.id, id)).get();
      const file = row?.files[fileIndex];
      if (
        !file ||
        classifyLibraryFile(file.path, file.mimeType).mediaType !== "text"
      )
        return { ok: false, updated: false };
      const bytes = await readLibraryMedia(itemFile(id, file.path));
      const decoded = decodeTextBytes(bytes);
      if (decoded.encoding === "utf-8" && !decoded.hadBom)
        return { ok: true, updated: false };
      const directory = await mkdtemp(join(tmpdir(), "pond-text-"));
      const path = join(directory, basename(file.path));
      try {
        await writeFile(path, decoded.text, "utf8");
        const result = await replaceSaveFile({ id, sourcePath: path });
        return { ok: result.ok, updated: result.ok };
      } finally {
        await rm(directory, { recursive: true, force: true });
      }
    },
  ),

  "saves.regeneratePoster": query(
    z.object({ id: StringParam }),
    async ({ id }) => {
      await runEnsurePoster(id, { force: true });
      return { ok: true };
    },
  ),

  "saves.ensureTextCover": query(
    z.object({ id: StringParam, force: FlagParam.default(false) }),
    async (params) => {
      if (!params.id) return { ok: false as const, captured: 0 };
      const captured = await runRenderTextCover(params.id, {
        force: params.force,
      });
      return { ok: true as const, captured };
    },
  ),

  "saves.findDuplicates": query(
    z.object({
      visualDistance: z.number().int().min(0).max(64).optional(),
    }),
    async (params) => {
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
      return duplicateGroups(rows, {
        visualDistance: params.visualDistance,
      });
    },
  ),

  "saves.mergeDuplicates": query(
    z.object({ keepId: StringParam, ids: StringListParam }),
    async (params) => mergeDuplicateSaves(params),
  ),
} satisfies QueryHandlerMap;
