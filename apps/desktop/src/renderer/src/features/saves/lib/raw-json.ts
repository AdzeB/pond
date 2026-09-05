import { StoredRawJsonSchema, storedAsRawJson } from "@pond/schema/raw-schema";
import { z } from "zod";
import { patchSaveRawJson, pool } from "@/features/saves/state/pool";

const RawJsonReplySchema = z.object({
  rawJson: StoredRawJsonSchema.transform(storedAsRawJson).nullish().catch(null),
});

const inflight = new Set<string>();
const loaded = new Set<string>();

export async function ensureRawJson(id: string): Promise<void> {
  if (!id || loaded.has(id) || inflight.has(id)) return;
  inflight.add(id);
  try {
    const res = RawJsonReplySchema.parse(
      await window.pond.query("saves.rawJson", { id }),
    );
    loaded.add(id);
    if (pool.get(id)) patchSaveRawJson(id, res.rawJson ?? null);
  } catch {
  } finally {
    inflight.delete(id);
  }
}
