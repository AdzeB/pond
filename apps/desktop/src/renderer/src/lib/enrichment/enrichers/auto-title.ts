import { mutateSave } from "@/lib/mutate-save";
import type { Save } from "@/lib/types";
import { pool } from "@/stores/pool";
import type { Enricher } from "../types";

const AUTO_TITLE_VERSION = "auto-title@1";

function hasTitle(save: Save): boolean {
  return !!save.title && save.title.trim().length > 0;
}

// First sentence / line of the best available text, trimmed to a title length.
function deriveTitle(save: Save): string | null {
  const source =
    save.caption ?? firstLine(save.ocrText) ?? firstLine(save.description);
  if (!source) return null;
  const sentence = source.split(/(?<=[.!?])\s/)[0] ?? source;
  const title = sentence.trim().replace(/\s+/g, " ").slice(0, 80);
  return title.length > 0 ? title : null;
}

function firstLine(text: string | null | undefined): string | null {
  if (!text) return null;
  const line = text.split(/\r?\n/).find((l) => l.trim().length > 0);
  return line ? line.trim() : null;
}

// Fill an empty title from caption / OCR / description. Non-destructive: only
// writes when the title is still empty at run time, so it never clobbers an edit.
export const autoTitleEnricher: Enricher = {
  id: "autoTitle",
  dependsOn: ["caption", "ocr"],
  enabled: (prefs) => prefs?.ai?.enableAutoTitle === true,
  eligible(save: Save) {
    if (save.status !== "complete" || save.deletedAt != null) return false;
    if (hasTitle(save)) return false;
    if (save.autoTitleModel === AUTO_TITLE_VERSION) return false;
    return !!deriveTitle(save);
  },
  async run(save: Save) {
    const title = deriveTitle(save);
    if (!title) return null;
    // Re-check against the live pool so a concurrent user edit always wins.
    const current = pool.get(save.id) ?? save;
    if (!hasTitle(current)) {
      await mutateSave(save.id, { title }, { actorReason: "ai:auto-title" });
    }
    // Stamp regardless so we don't retry a save the user intentionally left empty.
    return { derived: { autoTitleModel: AUTO_TITLE_VERSION } };
  },
};
