import type { RawJson } from "@pond/schema/raw";
import { patchSaveRawJson, pool } from "./pool";

// The list ships a slim rawJson; the detail view calls ensureRawJson(id) once on open to hydrate the full blob.
const inflight = new Set<string>();
const loaded = new Set<string>();

export async function ensureRawJson(id: string): Promise<void> {
  if (!id || loaded.has(id) || inflight.has(id)) return;
  inflight.add(id);
  try {
    const res = (await window.pond.query("saves.rawJson", { id })) as {
      id: string;
      rawJson: RawJson | null;
    };
    loaded.add(id);
    if (pool.get(id)) patchSaveRawJson(id, res.rawJson);
  } catch {
    // Best-effort: a failure just hides a few detail rows the slim projection doesn't cover.
  } finally {
    inflight.delete(id);
  }
}
