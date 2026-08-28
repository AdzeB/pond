import type { NewSave } from "@pond/schema/db";
import type { Transaction, TxMeta } from "@pond/schema/tx";
import type { Save } from "@/lib/types";
import { optimistic } from "@/stores/bootstrap";
import { pool } from "@/stores/pool";

interface MutateOpts {
  actorReason?: string;
}

export type SaveEdit = Partial<
  Omit<
    Save,
    | "id"
    | "tasks"
    | "savedAt"
    | "createdAt"
    | "deletedAt"
    | "publishedAt"
    | "ingestStartedAt"
    | "ingestCompletedAt"
  >
>;

function metaFor(opts: MutateOpts): TxMeta | undefined {
  if (!opts.actorReason) return undefined;
  return { actor: "user", actorReason: opts.actorReason };
}

function toNewSave(save: Save): NewSave {
  const { tasks: _tasks, ...columns } = save;
  return {
    ...columns,
    savedAt: new Date(save.savedAt),
    createdAt: new Date(save.createdAt),
    deletedAt: save.deletedAt === null ? null : new Date(save.deletedAt),
    publishedAt: save.publishedAt == null ? null : new Date(save.publishedAt),
    ingestStartedAt:
      save.ingestStartedAt == null ? null : new Date(save.ingestStartedAt),
    ingestCompletedAt:
      save.ingestCompletedAt == null ? null : new Date(save.ingestCompletedAt),
  };
}

function snapshotBefore(prev: Save, patch: SaveEdit): Partial<NewSave> {
  const previous = toNewSave(prev);
  const before: Partial<NewSave> = {};
  // SAFETY: `patch` is a `SaveEdit`, so each of its own keys is a column of `NewSave`.
  for (const key of Object.keys(patch) as Array<keyof NewSave>) {
    Object.assign(before, { [key]: previous[key] });
  }
  return before;
}

export async function mutateSave(
  id: string,
  patch: SaveEdit,
  opts: MutateOpts = {},
): Promise<void> {
  const prev = pool.get(id);
  if (!prev) return;
  const tx: Transaction = {
    kind: "update",
    model: "save",
    id,
    patch,
    before: snapshotBefore(prev, patch),
  };
  const meta = metaFor(opts);
  if (meta) tx.meta = meta;
  await optimistic(
    () => pool.upsert({ ...prev, ...patch }),
    () => pool.upsert(prev),
    async () => window.pond.tx(tx),
  );
}

export async function setSaveTags(id: string, tags: string[]): Promise<void> {
  const prev = pool.get(id);
  if (!prev) return;
  await optimistic(
    () => pool.upsert({ ...prev, tags }),
    () => pool.upsert(prev),
    async () => window.pond.query("tags.setForSave", { saveId: id, tags }),
  );
}

export async function trashSave(id: string): Promise<void> {
  const prev = pool.get(id);
  if (!prev) return;
  await optimistic(
    () => pool.upsert({ ...prev, deletedAt: Date.now() }),
    () => pool.upsert(prev),
    async () => window.pond.tx({ kind: "trash", model: "save", id }),
  );
}

export async function untrashSave(id: string): Promise<void> {
  const prev = pool.get(id);
  if (!prev) return;
  await optimistic(
    () => pool.upsert({ ...prev, deletedAt: null }),
    () => pool.upsert(prev),
    async () => window.pond.tx({ kind: "untrash", model: "save", id }),
  );
}

export async function purgeSave(id: string): Promise<void> {
  const prev = pool.get(id);
  if (!prev) return;
  await optimistic(
    () => pool.delete(id),
    () => pool.upsert(prev),
    async () =>
      window.pond.tx({
        kind: "purge",
        model: "save",
        id,
        before: toNewSave(prev),
      }),
  );
}

export async function trashSaves(
  ids: readonly string[],
  opts: MutateOpts = {},
): Promise<number> {
  const now = Date.now();
  const changes: { prev: Save; next: Save; tx: Transaction }[] = [];
  for (const id of ids) {
    const prev = pool.get(id);
    if (!prev) continue;
    const tx: Transaction = { kind: "trash", model: "save", id };
    const meta = metaFor(opts);
    if (meta) tx.meta = meta;
    changes.push({ prev, next: { ...prev, deletedAt: now }, tx });
  }
  if (changes.length === 0) return 0;
  await optimistic(
    () => {
      for (const c of changes) pool.upsert(c.next);
    },
    () => {
      for (const c of changes) pool.upsert(c.prev);
    },
    async () => window.pond.batch(changes.map((c) => c.tx)),
  );
  return changes.length;
}

export async function untrashSaves(
  ids: readonly string[],
  opts: MutateOpts = {},
): Promise<number> {
  const changes: { prev: Save; next: Save; tx: Transaction }[] = [];
  for (const id of ids) {
    const prev = pool.get(id);
    if (!prev) continue;
    const tx: Transaction = { kind: "untrash", model: "save", id };
    const meta = metaFor(opts);
    if (meta) tx.meta = meta;
    changes.push({ prev, next: { ...prev, deletedAt: null }, tx });
  }
  if (changes.length === 0) return 0;
  await optimistic(
    () => {
      for (const c of changes) pool.upsert(c.next);
    },
    () => {
      for (const c of changes) pool.upsert(c.prev);
    },
    async () => window.pond.batch(changes.map((c) => c.tx)),
  );
  return changes.length;
}

export async function purgeSaves(ids: readonly string[]): Promise<number> {
  const changes: { prev: Save; tx: Transaction }[] = [];
  for (const id of ids) {
    const prev = pool.get(id);
    if (!prev) continue;
    changes.push({
      prev,
      tx: { kind: "purge", model: "save", id, before: toNewSave(prev) },
    });
  }
  if (changes.length === 0) return 0;
  await optimistic(
    () => {
      for (const c of changes) pool.delete(c.prev.id);
    },
    () => {
      for (const c of changes) pool.upsert(c.prev);
    },
    async () => window.pond.batch(changes.map((c) => c.tx)),
  );
  return changes.length;
}
