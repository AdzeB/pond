import { bulkUpsertSaves, deleteSave, pool } from "@/features/saves/state/pool";
import type { Save } from "@/features/saves/types";
import { applyAction, normalise, type SyncActionEvent } from "./reconcile";

const pending = new Map<string, Save>();
const pendingDeletes = new Set<string>();
let flushScheduled = false;

function scheduleFlush(): void {
  if (flushScheduled) return;
  flushScheduled = true;
  const run = () => {
    flushScheduled = false;
    const deletes = [...pendingDeletes];
    pendingDeletes.clear();
    const upserts = [...pending.values()];
    pending.clear();
    for (const id of deletes) deleteSave(id);
    if (upserts.length > 0) bulkUpsertSaves(upserts);
  };
  if ("requestAnimationFrame" in globalThis) {
    requestAnimationFrame(run);
  } else {
    queueMicrotask(run);
  }
}

export function applyActionCoalesced(event: SyncActionEvent): void {
  if (event.modelName !== "save") {
    applyAction(event);
    return;
  }

  if (event.action === "D") {
    pending.delete(event.modelId);
    pendingDeletes.add(event.modelId);
    scheduleFlush();
    return;
  }

  pendingDeletes.delete(event.modelId);

  if (event.action === "I") {
    const save = normalise(event.data);
    if (save) {
      pending.set(save.id, save);
      scheduleFlush();
    }
    return;
  }

  if (event.action === "U") {
    const patch = event.data;
    const base = pending.get(event.modelId) ?? pool.get(event.modelId);
    if (!base && !patch?.url) return;
    const merged = normalise(
      base
        ? { ...base, ...patch, id: base.id }
        : { ...patch, id: event.modelId },
    );
    if (merged) {
      pending.set(merged.id, merged);
      scheduleFlush();
    }
    return;
  }

  if (event.action === "A") {
    const base = pending.get(event.modelId) ?? pool.get(event.modelId);
    if (!base) return;
    const merged = normalise({
      ...base,
      ...event.data,
      id: base.id,
    });
    if (merged) {
      pending.set(merged.id, merged);
      scheduleFlush();
    }
  }
}
