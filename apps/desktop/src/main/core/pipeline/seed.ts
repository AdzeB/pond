import {
  type MediaType,
  type NewSave,
  type Save,
  saves,
  syncActions,
  tasks,
} from "@pond/schema/db";
import type { CaptureAuthor, RawJson } from "@pond/schema/raw";
import { and, eq } from "drizzle-orm";
import { ulid } from "ulid";
import { getDb } from "../../db";
import { broadcastSyncAction } from "../executor";

export interface EnqueueSeed {
  rawJson: RawJson;
  title?: string | null;
  description?: string | null;
  author?: string | null;
  mediaUrl?: string | null;
  mediaType?: MediaType | null;
  publishedAt?: Date | null;
  lang?: string | null;
}

export function seedToInsertColumns(seed: EnqueueSeed): Partial<NewSave> {
  const out: Partial<NewSave> = { rawJson: seed.rawJson };
  if (seed.title !== undefined) out.title = seed.title;
  if (seed.description !== undefined) out.description = seed.description;
  if (seed.author !== undefined) out.author = seed.author;
  if (seed.mediaUrl !== undefined) out.mediaUrl = seed.mediaUrl;
  if (seed.mediaType !== undefined) out.mediaType = seed.mediaType;
  if (seed.publishedAt !== undefined) out.publishedAt = seed.publishedAt;
  if (seed.lang !== undefined) out.lang = seed.lang;
  return out;
}

export async function applySeedToExistingSave(
  saveId: string,
  seed: EnqueueSeed,
): Promise<void> {
  const db = await getDb();
  const patch = seedToInsertColumns(seed);
  db.update(saves).set(patch).where(eq(saves.id, saveId)).run();
  const inserted = db
    .insert(syncActions)
    .values({
      modelName: "save",
      modelId: saveId,
      action: "U",
      data: patch as unknown,
      actor: "system",
      actorReason: "pipeline:enqueue:reseed",
      batchId: ulid(),
    })
    .returning()
    .all()[0];
  if (inserted) broadcastSyncAction(inserted);
}

interface SeedMerge {
  changed: boolean;
  filled: string[];
  didFillAvatarUrl: boolean;
  rawJson: RawJson | null;
}

// Additive merge: fills missing `capture.author.*`, `capture.metrics`, and
// `capture.extras.card` from the seed, never overwriting existing values. Lets a
// re-sync backfill link cards / metrics onto saves ingested before those existed.
export function mergeSeedIntoExistingSave(
  current: Save,
  seed: EnqueueSeed,
): SeedMerge {
  const existingRaw =
    current.rawJson && typeof current.rawJson === "object"
      ? (current.rawJson as RawJson)
      : null;
  const seedRaw = seed.rawJson;
  const existingCapture = existingRaw?.capture;
  const seedCapture = seedRaw.capture;

  const existingAuthor: CaptureAuthor = existingCapture?.author ?? {};
  const seedAuthor: CaptureAuthor = seedCapture?.author ?? {};
  const nextAuthor: CaptureAuthor = { ...existingAuthor };
  const filled: string[] = [];
  let didFillAvatarUrl = false;
  for (const key of [
    "name",
    "handle",
    "avatarUrl",
    "profileUrl",
    "verified",
  ] as const) {
    const have = nextAuthor[key];
    const fresh = seedAuthor[key];
    if ((have === undefined || have === null || have === "") && fresh != null) {
      (nextAuthor[key] as unknown) = fresh;
      filled.push(`capture.author.${key}`);
      if (key === "avatarUrl") didFillAvatarUrl = true;
    }
  }

  // Backfill metrics only when the existing capture has none.
  const existingMetrics = existingCapture?.metrics;
  const seedMetrics = seedCapture?.metrics;
  let nextMetrics = existingMetrics;
  if (
    (!existingMetrics || Object.keys(existingMetrics).length === 0) &&
    seedMetrics &&
    Object.keys(seedMetrics).length > 0
  ) {
    nextMetrics = { ...seedMetrics };
    filled.push("capture.metrics");
  }

  // Backfill the link card only when absent.
  const existingExtras = (existingCapture?.extras ?? {}) as Record<
    string,
    unknown
  >;
  const seedExtras = (seedCapture?.extras ?? {}) as Record<string, unknown>;
  let nextExtras = existingExtras;
  if (!existingExtras.card && seedExtras.card) {
    nextExtras = { ...existingExtras, card: seedExtras.card };
    filled.push("capture.extras.card");
  }

  if (filled.length === 0) {
    return { changed: false, filled, didFillAvatarUrl, rawJson: existingRaw };
  }

  const baseRaw = existingRaw ?? seedRaw;
  const baseCapture = existingCapture ?? seedCapture;
  const nextRaw: RawJson = {
    ...baseRaw,
    capture: {
      ...baseCapture,
      author: nextAuthor,
      ...(nextMetrics ? { metrics: nextMetrics } : {}),
      ...(Object.keys(nextExtras).length > 0 ? { extras: nextExtras } : {}),
    },
  };

  return { changed: true, filled, didFillAvatarUrl, rawJson: nextRaw };
}

export async function persistEnrichment(
  saveId: string,
  merge: SeedMerge,
): Promise<void> {
  if (!merge.changed || !merge.rawJson) return;
  const db = await getDb();
  const patch: Partial<NewSave> = { rawJson: merge.rawJson };
  db.update(saves).set(patch).where(eq(saves.id, saveId)).run();
  const inserted = db
    .insert(syncActions)
    .values({
      modelName: "save",
      modelId: saveId,
      action: "U",
      data: { filled: merge.filled } as unknown,
      actor: "system",
      actorReason: "pipeline:enqueue:enrich",
      batchId: ulid(),
    })
    .returning()
    .all()[0];
  if (inserted) broadcastSyncAction(inserted);
}

// Re-pend only `done` fetch_avatar rows so the newly-filled URL lands on disk.
export async function rependFetchAvatar(saveId: string): Promise<void> {
  const db = await getDb();
  const now = new Date();
  db.update(tasks)
    .set({ status: "pending", nextRunAt: now, lastError: null, updatedAt: now })
    .where(
      and(
        eq(tasks.saveId, saveId),
        eq(tasks.op, "fetch_avatar"),
        eq(tasks.status, "done"),
      ),
    )
    .run();
}
