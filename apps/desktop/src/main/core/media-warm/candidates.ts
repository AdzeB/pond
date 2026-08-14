import type { Save } from "@pond/schema/db";
import { pickBlurhashStill } from "../../lib/blurhash";
import { needsPosterRepair } from "../../lib/poster-policy";

export type MediaWarmCandidate =
  | { kind: "poster"; saveId: string; title: string }
  | { kind: "blurhash"; saveId: string; title: string };

type CandidateSave = Pick<
  Save,
  "id" | "title" | "status" | "files" | "source" | "blurhash" | "coverIndex"
>;

/**
 * Background work for the grid: missing video posters, then a cover blurhash.
 * Cards load the original still; there is no derivative thumbnail to warm.
 */
export function mediaWarmCandidates(save: CandidateSave): MediaWarmCandidate[] {
  /** Failed legacy imports can still have valid, visible media; only skip files still being written. */
  if (save.status === "ingesting") return [];
  const title = save.title?.trim() || "Untitled save";
  const files = save.files ?? [];

  if (needsPosterRepair(files)) {
    return [{ kind: "poster", saveId: save.id, title }];
  }

  if (!save.blurhash && pickBlurhashStill(save)) {
    return [{ kind: "blurhash", saveId: save.id, title }];
  }
  return [];
}
