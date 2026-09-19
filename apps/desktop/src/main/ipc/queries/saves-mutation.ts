import { saves } from "@pond/schema/db";
import type { Transaction } from "@pond/schema/tx";
import { eq, isNotNull, isNull } from "drizzle-orm";
import { z } from "zod";
import { duplicateGroups } from "../../core/duplicate-groups";
import { executeBatch } from "../../core/executor";
import { mergeDuplicateSaves } from "../../core/merge-duplicates";
import { persistSave } from "../../core/persist-save";
import { retryFailedSaves } from "../../core/pipeline/enqueue";
import { skipSaves } from "../../core/pipeline/reconciler-client";
import { runRenderTextCover } from "../../core/pipeline/workers/render-text-cover";
import { recordForUndo } from "../../core/undo";
import { parseJsonVector, upsertVec } from "../../core/vec-index";
import { getDb } from "../../db";
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

export const savesMutationQueries = {
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
    return duplicateGroups(rows);
  },

  "saves.mergeDuplicates": query(
    z.object({ keepId: StringParam, ids: StringListParam }),
    async (params) => mergeDuplicateSaves(params),
  ),
} satisfies QueryHandlerMap;
