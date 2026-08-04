import { needsTextCover } from "@/lib/media/units";
import type { Save } from "@/lib/types";

const requested = new Set<string>();

/** Fire-and-forget backfill for text-only saves missing their rasterized cover. */
export function ensureTextCover(save: Save): void {
  if (!needsTextCover(save)) return;
  if (requested.has(save.id)) return;
  requested.add(save.id);
  void window.pond.query("saves.ensureTextCover", { id: save.id });
}
