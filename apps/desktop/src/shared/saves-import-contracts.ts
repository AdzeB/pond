import type { MediaType, Source } from "@pond/schema/db";
import type { BlankDocumentKind } from "./blank-documents";
import type { CombineImagesOptions } from "./combine-images-contracts";
import type { EmptyInput, OkResult } from "./query-contracts-shared";
import type {
  SavesIdsInput,
  SavesImportResult,
} from "./saves-contracts-shared";

export interface DuplicateImportCandidate {
  path: string;
  filename: string;
  existingId: string;
  existingTitle: string | null;
}

export type DuplicateImportChoice = "use-existing" | "keep-both";

export interface EagleImportProgress {
  id: string;
  processed: number;
  total: number;
  imported: number;
  skipped: number;
  failed: number;
}

export interface DesktopScreenshotSource {
  id: string;
  name: string;
  kind: "screen" | "window";
  thumbnailDataUrl: string;
}

export interface DesktopScreenshotCrop {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface SavesImportQueryInputs {
  "saves.importEaglePackage": EmptyInput;
  "saves.importPackage": { password?: string };
  "saves.pickImportPaths": { kind: "files" | "folders" };
  "saves.classifyUrl": { url: string };
  "saves.importFiles": {
    paths: string[];
    tags?: string[];
    folderIds?: string[];
    duplicatePolicy?: DuplicateImportChoice;
    duplicateDecisions?: Record<string, DuplicateImportChoice>;
  };
  "saves.reviewImportDuplicates": { paths: string[] };
  "saves.desktopScreenshotSources": EmptyInput;
  "saves.captureDesktopScreenshot": {
    sourceId: string;
    folderId?: string | null;
    title?: string | null;
    notes?: string | null;
    tags?: string[];
    rating?: number;
    format?: "png" | "jpeg" | "webp";
    quality?: number;
    crop?: DesktopScreenshotCrop | null;
    copyToClipboard?: boolean;
  };
  "saves.createManual": {
    title?: string | null;
    url?: string | null;
    note?: string | null;
    tags?: string[];
    filePaths?: string[];
    sourceId?: string | null;
    mediaType?: MediaType | null;
    width?: number;
    height?: number;
  };
  "saves.listBlankDocuments": EmptyInput;
  "saves.createBlankDocument": {
    kind: BlankDocumentKind;
    folderId?: string | null;
  };
  "saves.combineImages": {
    ids: string[];
    folderId?: string | null;
    options?: Partial<CombineImagesOptions>;
  };
  "saves.importEagleLibrary": {
    path: string;
    dryRun?: boolean;
    importShortcuts?: boolean;
    progressId?: string;
  };
  "saves.pickEagleLibrary": EmptyInput;
  "saves.importClipboard": EmptyInput;
  "saves.importBookmarks": EmptyInput;
  "saves.extractPageAssets": { url: string };
  "saves.quickAdd": { url?: string; note?: string | null; tags?: string[] };
  "saves.startDrag": {
    id?: string;
    path?: string;
    ids?: string[];
    fileIndex?: number | null;
  };
  "saves.copyToLibrary": SavesIdsInput;
}

export interface SavesImportQueryResults {
  "saves.importEaglePackage": {
    ok: boolean;
    imported?: number;
    skipped?: number;
    error?: string;
  };
  "saves.importPackage": {
    ok: boolean;
    imported?: number;
    skipped?: number;
    error?: string;
  };
  "saves.pickImportPaths": { paths: string[] };
  "saves.classifyUrl": { source: Source | null };
  "saves.importFiles": OkResult & { ids?: string[] };
  "saves.reviewImportDuplicates": {
    candidates: DuplicateImportCandidate[];
  };
  "saves.desktopScreenshotSources": {
    sources: DesktopScreenshotSource[];
  };
  "saves.captureDesktopScreenshot": OkResult & {
    id?: string;
    error?: "source_not_found" | "capture_unavailable" | "save_failed";
  };
  "saves.createManual": OkResult & { id?: string; skipped?: boolean };
  "saves.listBlankDocuments": { kinds: BlankDocumentKind[] };
  "saves.createBlankDocument": OkResult & { id?: string };
  "saves.combineImages": OkResult & {
    id?: string;
    skipped?: number;
    error?: string;
  };
  "saves.importEagleLibrary": SavesImportResult & {
    failed: number;
    deletedSkipped: number;
    lockedFolders: {
      id: string;
      name: string;
      reason: "password" | "parent_locked";
    }[];
    droppedFields: string[];
    shortcuts: {
      status:
        | "available"
        | "missing"
        | "invalid"
        | "unreadable"
        | "apply_failed";
      importable: number;
      imported: number;
    };
  };
  "saves.pickEagleLibrary": { ok: boolean; path: string | null };
  "saves.importClipboard": OkResult & { ids: string[] };
  "saves.importBookmarks": SavesImportResult;
  "saves.extractPageAssets": SavesImportResult;
  "saves.quickAdd": OkResult & { id?: string; created?: boolean };
  "saves.startDrag": OkResult;
  "saves.copyToLibrary": {
    ok: boolean;
    path?: string;
    imported?: number;
    skipped?: number;
    error?: string;
  };
}
