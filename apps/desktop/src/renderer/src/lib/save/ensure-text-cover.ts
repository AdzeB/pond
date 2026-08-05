import { needsTextCover } from "@/lib/media/units";
import type { Save } from "@/lib/types";

const requested = new Set<string>();

/** Drop a pending request so a later mount can retry after failure or a forced regen. */
export function clearTextCoverRequest(id: string): void {
  requested.delete(id);
}

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
      const ok =
        result &&
        typeof result === "object" &&
        "ok" in result &&
        (result as { ok: boolean }).ok;
      const captured =
        result &&
        typeof result === "object" &&
        "captured" in result &&
        typeof (result as { captured: unknown }).captured === "number"
          ? (result as { captured: number }).captured
          : 0;
      if (!ok || captured === 0) requested.delete(save.id);
    })
    .catch(() => {
      requested.delete(save.id);
    });
}
