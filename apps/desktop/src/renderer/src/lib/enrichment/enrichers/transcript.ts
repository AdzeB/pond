import {
  deriveTypeKind,
  pickPrimaryFile,
  pickPrimaryUnit,
} from "@/lib/media/units";
import type { Save } from "@/lib/types";
import type { Enricher } from "../types";
import {
  MAX_TRANSCRIPT_BYTES,
  transcribeAudio,
  whisperModelVersion,
} from "../whisper";

function isAudioVisual(save: Save): boolean {
  const file = pickPrimaryFile(save);
  const kind = deriveTypeKind(file, save);
  return kind === "video" || kind === "audio";
}

function skipped(model: string) {
  const fields = { transcript: null, transcriptModel: model };
  return { derived: fields, optimistic: fields };
}

export const transcriptEnricher: Enricher = {
  id: "transcript",
  enabled: (prefs) => prefs?.ai?.enableTranscript === true,
  eligible(save: Save) {
    if (save.status !== "complete" || save.deletedAt != null) return false;
    if (!isAudioVisual(save)) return false;
    return save.transcriptModel !== whisperModelVersion();
  },
  async run(save: Save) {
    const model = whisperModelVersion();
    const unit = pickPrimaryUnit(save);
    const url = unit?.url;
    if (!url) return skipped(model);
    const file = pickPrimaryFile(save);
    if (file?.size != null && file.size > MAX_TRANSCRIPT_BYTES) {
      return skipped(model);
    }
    try {
      const transcript = await transcribeAudio(url);
      const fields = { transcript: transcript || null, transcriptModel: model };
      return { derived: fields, optimistic: fields };
    } catch (err) {
      console.warn(`[enrichment] transcript failed for ${save.id}`, err);
      return skipped(model);
    }
  },
};
