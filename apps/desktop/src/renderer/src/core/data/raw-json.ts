import type { RawJson } from "@pond/schema/raw";
import { patchSaveRawJson, pool } from "./pool";

// The list payload (`saves.list`) ships only a slim `rawJson` projection to
// keep boot small. The detail view needs the full blob (metrics, chapters,
// description, …), so it calls `ensureRawJson(id)` on open to hydrate the
// pooled save once. Guarded so repeated opens / re-renders don't re-fetch.
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
    // Best-effort hydration: the slim projection already covers duration and
    // media type, so a failure just means a few detail rows stay hidden.
  } finally {
    inflight.delete(id);
  }
}
