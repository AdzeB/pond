import { patchSaveTranscript, pool } from "@/stores/pool";

/** The list payload omits the potentially large transcript; the detail view hydrates it from the DB once on open. */
const inflight = new Set<string>();
const loaded = new Set<string>();

export async function ensureTranscript(id: string): Promise<void> {
  if (!id || loaded.has(id) || inflight.has(id)) return;
  inflight.add(id);
  try {
    const res = (await window.pond.query("saves.transcript", { id })) as {
      id: string;
      transcript: string | null;
    };
    loaded.add(id);
    if (pool.get(id)) patchSaveTranscript(id, res.transcript);
  } catch {
    /** Best-effort; a failure just hides the transcript block. */
  } finally {
    inflight.delete(id);
  }
}
