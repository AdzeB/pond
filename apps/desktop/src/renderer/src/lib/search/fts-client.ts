/** Renderer facade over main-process `saves.searchFts`. */

export type FtsMode = "all" | "any";

export async function searchFtsScores(
  q: string,
  mode: FtsMode = "all",
  opts?: { deletedOnly?: boolean; limit?: number },
): Promise<Map<string, number>> {
  const trimmed = q.trim();
  if (!trimmed) return new Map();
  const res = (await window.pond.query("saves.searchFts", {
    q: trimmed,
    mode,
    deletedOnly: opts?.deletedOnly ?? false,
    limit: opts?.limit ?? 10_000,
  })) as { ids: string[]; scores: Record<string, number> };
  const out = new Map<string, number>();
  for (const id of res.ids ?? []) {
    out.set(id, res.scores?.[id] ?? 0);
  }
  return out;
}
