import type { EmptyInput, OkResult } from "./query-contracts-shared";
import type { SavesDerivedPatch, SavesIdInput } from "./saves-contracts-shared";

export interface SavesMutationQueryInputs {
  "saves.emptyTrash": EmptyInput;
  "saves.restoreAll": EmptyInput;
  "saves.retryFailed": { ids?: string[] };
  "saves.skipIngest": { ids: string[] };
  "saves.setPhash": { id: string; phash: string | null };
  "saves.setEmbedding": {
    id: string;
    embedding: number[] | null;
    embeddingModel: string | null;
  };
  "saves.patchDerived": { id: string; patch: SavesDerivedPatch };
  "saves.ensureTextCover": { id: string; force?: boolean };
  "saves.mergeDuplicates": { keepId: string; ids: string[] };
  "saves.batchRename": { ids: string[]; pattern: string };
  "saves.activateFont": SavesIdInput;
  "saves.deactivateFont": SavesIdInput;
  "saves.setAudioAnalysis": { id: string; bpm: number };
  "saves.setCustomThumbnail": SavesIdInput;
  "saves.setGifThumbnail": {
    id: string;
    src: string;
    frameIndex: number;
  };
  "saves.loadSubtitles": SavesIdInput;
  "saves.replaceFile": SavesIdInput;
  "saves.removeCustomThumbnail": SavesIdInput;
  "saves.backfillColors": EmptyInput;
  "saves.findDuplicates": EmptyInput;
}

export interface SavesMutationQueryResults {
  "saves.emptyTrash": OkResult & { count: number };
  "saves.restoreAll": OkResult & { count: number };
  "saves.retryFailed": OkResult & { requeued: number };
  "saves.skipIngest": OkResult & { skipped: number };
  "saves.setPhash": OkResult;
  "saves.setEmbedding": OkResult;
  "saves.patchDerived": OkResult;
  "saves.ensureTextCover": OkResult & { captured: number };
  "saves.mergeDuplicates": OkResult & { trashed: number };
  "saves.batchRename": OkResult & { renamed: number };
  "saves.activateFont": OkResult & { path?: string; error?: string };
  "saves.deactivateFont": OkResult & { error?: string };
  "saves.setAudioAnalysis": OkResult;
  "saves.setCustomThumbnail": OkResult & { canceled?: boolean };
  "saves.setGifThumbnail": OkResult & { error?: string };
  "saves.loadSubtitles": OkResult & { canceled?: boolean; error?: string };
  "saves.replaceFile": OkResult & { canceled?: boolean; error?: string };
  "saves.removeCustomThumbnail": OkResult;
  "saves.backfillColors": OkResult & { updated: number };
  "saves.findDuplicates": {
    groups: { kind: "exact" | "similar"; ids: string[] }[];
    visualIndexed: number;
    total: number;
  };
}
