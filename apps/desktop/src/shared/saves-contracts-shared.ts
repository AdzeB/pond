import type { MediaType, Source } from "@pond/schema/db";
import type { LibraryQueryRequest } from "./library-query";
import type { OkResult } from "./query-contracts-shared";

export interface SavesIdInput {
  id: string;
}

export interface SavesIdsInput {
  ids: string[];
}

export interface SavesFileInput extends SavesIdInput {
  fileIndex?: number | null;
}

export interface SavesRetrievalInput {
  libraryQuery?: LibraryQueryRequest;
  query?: string;
  source?: Source;
  folderId?: string;
  media?: MediaType[];
  limit?: number;
  saveIds?: string[];
  visual?:
    | { kind: "saveId"; id: string }
    | { kind: "vector"; model: string; values: number[] };
}

export interface SavesDerivedPatch {
  caption?: string | null;
  captionModel?: string | null;
  ocrText?: string | null;
  ocrModel?: string | null;
  transcript?: string | null;
  transcriptModel?: string | null;
  clipEmbedding?: number[] | null;
  clipModel?: string | null;
  aesthetic?: string[] | null;
  aestheticModel?: string | null;
  sensitiveScore?: number | null;
  sensitiveModel?: string | null;
  autoTitleModel?: string | null;
  suggestedTags?: string[] | null;
  suggestedTagsModel?: string | null;
}

export interface SavesImportResult extends OkResult {
  imported: number;
  skipped: number;
  queued?: number;
}
