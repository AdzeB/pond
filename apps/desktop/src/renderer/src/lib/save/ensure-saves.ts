import { normalise, SavePatchesSchema } from "@/lib/save/reconcile";
import type { Save } from "@/lib/types";
import { bulkUpsertSaves, pool } from "@/stores/pool";

export async function ensureSaves(ids: readonly string[]): Promise<void> {
  const missing: string[] = [];
  for (const id of ids) {
    if (!pool.get(id)) missing.push(id);
  }
  if (missing.length === 0) return;
  const rows = SavePatchesSchema.parse(
    await window.pond.query("saves.getMany", { ids: missing }),
  );
  const normalised = rows
    .map((row) => normalise(row))
    .filter((r): r is Save => r !== null);
  if (normalised.length > 0) bulkUpsertSaves(normalised);
}

/** Unlike ensureSaves, this replaces rows already held so task state can move on. */
export async function refreshSaves(ids: readonly string[]): Promise<void> {
  if (ids.length === 0) return;
  const rows = SavePatchesSchema.parse(
    await window.pond.query("saves.getMany", { ids: [...ids] }),
  );
  const normalised = rows
    .map((row) => normalise(row))
    .filter((r): r is Save => r !== null);
  if (normalised.length > 0) bulkUpsertSaves(normalised);
}
