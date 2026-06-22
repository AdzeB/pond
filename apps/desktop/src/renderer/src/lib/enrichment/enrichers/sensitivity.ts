import {
  classifySensitivity,
  persistVerdict,
  representativeImageUrl,
  SENSITIVITY_MODEL_VERSION,
} from "@/lib/nsfw";
import type { Save } from "@/lib/types";
import type { Enricher } from "../types";

// On-device NSFW classification, reimplemented as a registry enricher
// (behavior-preserving): same model stamp, same synced persistence via
// `saves.setSensitivity`, same "never persist on failure" rule. Always enabled
// so the blur preference can be toggled without leaving media unclassified.
export const sensitivityEnricher: Enricher = {
  id: "sensitivity",
  enabled: () => true,
  eligible(save: Save) {
    if (save.status !== "complete" || save.deletedAt != null) return false;
    if (!representativeImageUrl(save)) return false;
    return (
      save.sensitivity == null ||
      save.sensitivityModel !== SENSITIVITY_MODEL_VERSION
    );
  },
  async run(save: Save) {
    const verdict = await classifySensitivity(save);
    // Nothing classifiable yet — leave unstamped so a later pass retries.
    if (verdict == null) return null;
    await persistVerdict(save.id, verdict);
    // persistVerdict already updated the pool + DB (synced); nothing more to do.
    return {};
  },
};
