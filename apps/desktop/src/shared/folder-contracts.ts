import type { FolderMetadata } from "@pond/schema/db";

export interface FolderSummary {
  id: string;
  directSaveCount: number;
  childFolderCount: number;
  automaticCoverSaveId: string | null;
}

export interface FolderQueryInputs {
  "folders.summaries": { parentId: string };
  "folders.metadata.get": { folderId: string };
  "folders.metadata.set": {
    folderId: string;
    description: string | null;
    externalLink: string | null;
  };
  "folders.security.set": {
    folderId: string;
    password: string;
    currentPassword?: string;
    hint?: string | null;
    lockChildren?: boolean;
  };
  "folders.security.remove": { folderId: string; password?: string };
  "folders.security.unlock": { folderId: string; password: string };
  "folders.security.lock": { folderId: string };
  "folders.security.status": { folderId: string };
  "folders.security.list": Record<string, never>;
}

export interface FolderQueryResults {
  "folders.summaries": FolderSummary[];
  "folders.metadata.get": FolderMetadata;
  "folders.metadata.set": { ok: boolean };
  "folders.security.set": { ok: boolean };
  "folders.security.remove": { ok: boolean };
  "folders.security.unlock": { ok: boolean };
  "folders.security.lock": { ok: true };
  "folders.security.list": Array<{
    folderId: string;
    lockChildren: boolean;
  }>;
  "folders.security.status": {
    locked: boolean;
    protected: boolean;
    hint: string | null;
    lockChildren: boolean;
    unlockFolderId: string | null;
  };
}
