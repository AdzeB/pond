import type { Save } from "@/lib/types";
import { optimistic } from "@/stores/bootstrap";
import { pool } from "@/stores/pool";

interface MutateOpts {
  actorReason?: string;
}

function metaFor(opts: MutateOpts): { meta?: object } {
  return opts.actorReason
    ? { meta: { actor: "user", actorReason: opts.actorReason } }
    : {};
}

function snapshotBefore(prev: Save, patch: Partial<Save>): Partial<Save> {
  const source = prev as unknown as Record<string, unknown>;
  const before: Record<string, unknown> = {};
  for (const key of Object.keys(patch)) {
    before[key] = source[key];
  }
  return before as Partial<Save>;
}

export async function mutateSave(
  id: string,
  patch: Partial<Save>,
  opts: MutateOpts = {},
): Promise<void> {
  const prev = pool.get(id);
  if (!prev) return;
  const before = snapshotBefore(prev, patch);
  await optimistic(
    () => pool.upsert({ ...prev, ...patch }),
    () => pool.upsert(prev),
    async () =>
      window.pond.tx({
        kind: "update",
        model: "save",
        id,
        patch,
        before,
        ...metaFor(opts),
      }),
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
      window.pond.tx({ kind: "purge", model: "save", id, before: prev }),
  );
}

// Bulk trash, batched so the whole set restores with a single undo.
export async function trashSaves(
  ids: readonly string[],
  opts: MutateOpts = {},
): Promise<number> {
  const now = Date.now();
  const changes: { prev: Save; next: Save; tx: unknown }[] = [];
  for (const id of ids) {
    const prev = pool.get(id);
    if (!prev) continue;
    changes.push({
      prev,
      next: { ...prev, deletedAt: now },
      tx: { kind: "trash", model: "save", id, ...metaFor(opts) },
    });
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

// Bulk restore from trash, batched so the whole set can be re-trashed in one undo.
export async function untrashSaves(
  ids: readonly string[],
  opts: MutateOpts = {},
): Promise<number> {
  const changes: { prev: Save; next: Save; tx: unknown }[] = [];
  for (const id of ids) {
    const prev = pool.get(id);
    if (!prev) continue;
    changes.push({
      prev,
      next: { ...prev, deletedAt: null },
      tx: { kind: "untrash", model: "save", id, ...metaFor(opts) },
    });
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

// Bulk permanent delete. Irreversible, so no undo path is offered.
export async function purgeSaves(ids: readonly string[]): Promise<number> {
  const changes: { prev: Save; tx: unknown }[] = [];
  for (const id of ids) {
    const prev = pool.get(id);
    if (!prev) continue;
    changes.push({
      prev,
      tx: { kind: "purge", model: "save", id, before: prev },
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
