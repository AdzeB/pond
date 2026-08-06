import { needsTextCover } from "@/lib/media/units";
import type { Save } from "@/lib/types";

const requested = new Set<string>();

/** Fire-and-forget backfill for text-only saves missing their rasterized cover. */
export function ensureTextCover(
  save: Save,
  opts: { force?: boolean } = {},
): void {
  if (!opts.force && !needsTextCover(save)) return;
  if (!opts.force && requested.has(save.id)) return;
  if (opts.force) requested.delete(save.id);
  requested.add(save.id);
  void window.pond
    .query("saves.ensureTextCover", {
      id: save.id,
      ...(opts.force ? { force: true } : {}),
    })
    .then((result) => {
      const res = result as
        | { ok: true; captured: number }
        | { ok: false; captured: 0 };
      if (!res.ok || !res.captured) requested.delete(save.id);
    })
    .catch(() => {
      requested.delete(save.id);
    });
}
