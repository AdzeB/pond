import { deriveTypeKind, pickPrimaryFile, pickPrimaryUnit } from "@/lib/media";
import type { Save } from "@/lib/types";
import type { Enricher } from "../types";
import { transcribeAudio, whisperModelVersion } from "../whisper";

function isAudioVisual(save: Save): boolean {
  const file = pickPrimaryFile(save);
  const kind = deriveTypeKind(file, save);
  return kind === "video" || kind === "audio";
}

// On-device speech-to-text for video/audio saves via Whisper. The transcript is
// excluded from the saves.list payload (persisted via saves.patchDerived) but is
// mirrored into FTS by the saves update trigger.
export const transcriptEnricher: Enricher = {
  id: "transcript",
  enabled: (prefs) => prefs?.ai?.enableTranscript === true,
  eligible(save: Save) {
    if (save.status !== "complete" || save.deletedAt != null) return false;
    if (!isAudioVisual(save)) return false;
    return save.transcriptModel !== whisperModelVersion();
  },
  async run(save: Save) {
    const unit = pickPrimaryUnit(save);
    const url = unit?.url;
    if (!url) return null;
    const transcript = await transcribeAudio(url);
    const model = whisperModelVersion();
    const fields = { transcript: transcript || null, transcriptModel: model };
    return { derived: fields, optimistic: fields };
  },
};
