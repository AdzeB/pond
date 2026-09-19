import type { Query } from "@pond/schema/filters/types";
import type { RawJson } from "@pond/schema/raw";
import type { LibraryQueryPage, LibraryQueryRequest } from "./library-query";
import type { EmptyInput } from "./query-contracts-shared";
import type {
  SavesFileInput,
  SavesIdInput,
  SavesIdsInput,
  SavesRetrievalInput,
} from "./saves-contracts-shared";
import type { LibrarySidebarCounts } from "./sidebar-counts";
import type { WireSave } from "./wire";

export interface SavesReadQueryInputs {
  "saves.sidebarCounts": EmptyInput;
  "saves.queryPage": LibraryQueryRequest;
  "saves.queryIds": LibraryQueryRequest;
  "saves.queryCount": { query: Query };
  "saves.get": SavesIdInput;
  "saves.list": { limit?: number };
  "saves.listPage": {
    limit?: number;
    cursor?: { savedAt: number; id: string } | null;
  };
  "saves.searchFts": {
    q: string;
    limit?: number;
    deletedOnly?: boolean;
    mode?: "all" | "any";
  };
  "saves.retrieve": SavesRetrievalInput;
  "saves.query": {
    query: Query;
    deletedOnly?: boolean;
    sortKey?: string;
    sortDir?: string;
    limit?: number;
  };
  "saves.getMany": SavesIdsInput;
  "saves.rawJson": SavesIdInput;
  "saves.filePath": SavesFileInput;
  "saves.getEmbedding": SavesIdInput;
  "saves.publicImageUrl": SavesIdInput;
  "saves.fontStatus": SavesIdInput;
  "saves.embeddings": EmptyInput;
  "saves.clipEmbeddings": EmptyInput;
}

export interface SavesReadQueryResults {
  "saves.sidebarCounts": LibrarySidebarCounts;
  "saves.queryPage": LibraryQueryPage;
  "saves.queryIds": { ids: string[]; revision: number; libraryId: string };
  "saves.queryCount": { count: number };
  "saves.get": WireSave | null;
  "saves.list": WireSave[];
  "saves.listPage": {
    rows: WireSave[];
    nextCursor: { savedAt: number; id: string } | null;
    total: number | null;
  };
  "saves.searchFts": { ids: string[]; scores: Record<string, number> };
  "saves.query": { ids: string[] };
  "saves.getMany": WireSave[];
  "saves.rawJson": { id: string; rawJson: RawJson | null };
  "saves.filePath": { ok: true; path: string } | { ok: false; reason: string };
  "saves.getEmbedding": {
    id: string;
    embedding: number[] | null;
    embeddingModel: string | null;
  };
  "saves.publicImageUrl": { ok: boolean; url: string | null };
  "saves.fontStatus": { activated: boolean; path?: string };
  "saves.embeddings": {
    id: string;
    embedding: null;
    embeddingModel: string | null;
  }[];
  "saves.clipEmbeddings": {
    id: string;
    clipEmbedding: null;
    clipModel: string | null;
  }[];
}
