import type { FolderMetadata } from "@pond/schema/db";
import type { OkResult } from "./query-contracts-shared";

export interface FolderSummary {
  id: string;
  directSaveCount: number;
  childFolderCount: number;
  previewSaveIds: string[];
}

export interface FolderQueryInputs {
  "folders.summaries": { parentId: string };
  "folders.metadata.get": { folderId: string };
  "folders.metadata.set": {
    folderId: string;
    description: string | null;
    externalLink: string | null;
  };
}

export interface FolderQueryResults {
  "folders.summaries": FolderSummary[];
  "folders.metadata.get": FolderMetadata;
  "folders.metadata.set": OkResult;
}
