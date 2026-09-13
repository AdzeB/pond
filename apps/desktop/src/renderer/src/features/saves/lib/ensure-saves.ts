import { normalise, SavePatchesSchema } from "@/features/saves/lib/reconcile";
import { bulkUpsertSaves, pool } from "@/features/saves/state/pool";
import type { Save } from "@/features/saves/types";

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

export async function reloadSaves(ids: readonly string[]): Promise<void> {
  if (ids.length === 0) return;
  const rows = SavePatchesSchema.parse(
    await window.pond.query("saves.getMany", { ids: [...ids] }),
  );
  const normalised = rows
    .map((row) => normalise(row))
    .filter((r): r is Save => r !== null);
  if (normalised.length > 0) bulkUpsertSaves(normalised);
}
