import {
  type NewSave,
  type NewSyncAction,
  type NewTask,
  type Source,
  type SyncAction,
  saves,
  syncActions,
  tasks,
} from "@pond/schema/db";
import { domainFromUrl } from "@pond/schema/domain";
import { and, eq, inArray } from "drizzle-orm";
import log from "electron-log/main.js";
import { ulid } from "ulid";
import { getDb } from "../../db";
import { broadcastSyncAction } from "../executor";
import { type EnqueueOptions, enqueueSaveByUrl, normalizeUrl } from "./enqueue";
import { classifyUrlToSource } from "./extractors";
import { kickReconciler } from "./reconciler";
import { type EnqueueSeed, seedToInsertColumns } from "./seed";
import { maxAttemptsFor, planOps } from "./specs";
import { sourceIdFromUrl } from "./url";

interface BulkEnqueueItem {
  url: string;
  seed?: EnqueueSeed;
}

interface BulkEnqueueResult {
  created: number;
  existing: number;
  failed: number;
}

/** SQLite caps bound parameters per statement (~999 on the default build); keep each multi-row INSERT comfortably under that across the widest row. */
const BULK_INSERT_CHUNK = 100;

function chunk<T>(rows: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < rows.length; i += size) out.push(rows.slice(i, i + size));
  return out;
}

/** New saves use chunked multi-row INSERTs, far cheaper than per-URL round-trips at sync scale; already-known URLs fall back to the per-item path to keep reseed semantics. */
export async function enqueueSavesBulk(
  items: BulkEnqueueItem[],
  opts: EnqueueOptions = {},
): Promise<BulkEnqueueResult> {
  const db = await getDb();
  const result: BulkEnqueueResult = { created: 0, existing: 0, failed: 0 };

  interface Candidate {
    url: string;
    source: Source;
    sourceId: string;
    seed?: EnqueueSeed;
  }
  const candidates: Candidate[] = [];
  const seenKeys = new Set<string>();
  for (const item of items) {
    const url = normalizeUrl(item.url);
    const { source } = classifyUrlToSource(url);
    if (!source) {
      result.failed += 1;
      continue;
    }
    const sourceId = sourceIdFromUrl(source, url);
    if (!sourceId) {
      result.failed += 1;
      continue;
    }
    const key = `${source}\u0000${sourceId}`;
    if (seenKeys.has(key)) continue;
    seenKeys.add(key);
    candidates.push({ url, source, sourceId, seed: item.seed });
  }
  if (candidates.length === 0) return result;

  const bySource = new Map<string, Candidate[]>();
  for (const c of candidates) {
    const list = bySource.get(c.source) ?? [];
    list.push(c);
    bySource.set(c.source, list);
  }
  const existingKeys = new Set<string>();
  for (const [source, group] of bySource) {
    const ids = group.map((c) => c.sourceId);
    for (const idChunk of chunk(ids, 400)) {
      const rows = db
        .select({ sourceId: saves.sourceId })
        .from(saves)
        .where(
          and(
            eq(saves.source, source as Candidate["source"]),
            inArray(saves.sourceId, idChunk),
          ),
        )
        .all();
      for (const r of rows) existingKeys.add(`${source}\u0000${r.sourceId}`);
    }
  }

  const fresh: Candidate[] = [];
  const existing: Candidate[] = [];
  for (const c of candidates) {
    if (existingKeys.has(`${c.source}\u0000${c.sourceId}`)) existing.push(c);
    else fresh.push(c);
  }

  for (const c of existing) {
    try {
      await enqueueSaveByUrl(c.url, {
        trigger: opts.trigger,
        ...(c.seed ? { seed: c.seed } : {}),
      });
      result.existing += 1;
    } catch (err) {
      result.failed += 1;
      log.warn("[pond pipeline:enqueue] bulk existing item failed", c.url, err);
    }
  }

  if (fresh.length === 0) {
    if (result.existing > 0) kickReconciler();
    return result;
  }

  /** Commit in bounded chunks, yielding between them: better-sqlite3 is synchronous on the main thread, so one giant transaction would freeze the UI for seconds on a 50k first sync. */
  const now = new Date();
  const actorOf = (): "user" | "system" =>
    opts.trigger?.startsWith("user:") ? "user" : "system";
  interface Bundle {
    save: NewSave;
    tasks: NewTask[];
    action: NewSyncAction;
  }
  const bundles: Bundle[] = fresh.map((c) => {
    const id = ulid();
    const save: NewSave = {
      id,
      source: c.source,
      sourceId: c.sourceId,
      accountId: opts.accountId ?? null,
      url: c.url,
      siteName: domainFromUrl(c.url),
      status: "ingesting",
      ingestStartedAt: now,
      tags: [],
      files: [],
      coverIndex: 0,
      savedAt: now,
      createdAt: now,
      ...(c.seed ? seedToInsertColumns(c.seed) : {}),
    };
    const taskRows: NewTask[] = planOps(c.source).map((op) => ({
      id: ulid(),
      saveId: id,
      op,
      status: "pending",
      attempts: 0,
      maxAttempts: maxAttemptsFor(op),
      nextRunAt: now,
      createdAt: now,
      updatedAt: now,
    }));
    const action: NewSyncAction = {
      modelName: "save",
      modelId: id,
      action: "I",
      data: save as unknown,
      actor: actorOf(),
      actorReason: opts.trigger ?? "pipeline:enqueue:bulk",
      batchId: ulid(),
    };
    return { save, tasks: taskRows, action };
  });

  const insertedActions: SyncAction[] = [];
  for (const group of chunk(bundles, BULK_INSERT_CHUNK)) {
    const groupActions = db.transaction((tx) => {
      tx.insert(saves)
        .values(group.map((b) => b.save))
        .run();
      tx.insert(tasks)
        .values(group.flatMap((b) => b.tasks))
        .run();
      return tx
        .insert(syncActions)
        .values(group.map((b) => b.action))
        .returning()
        .all();
    });
    insertedActions.push(...groupActions);
    /** Yield so the UI thread can paint and handle IPC between commits. */
    await new Promise<void>((resolve) => setImmediate(resolve));
  }

  result.created = fresh.length;
  for (const action of insertedActions) broadcastSyncAction(action);
  kickReconciler();
  log.info("[pond pipeline:enqueue] bulk enqueue", {
    created: result.created,
    existing: result.existing,
    failed: result.failed,
    trigger: opts.trigger,
  });
  return result;
}
