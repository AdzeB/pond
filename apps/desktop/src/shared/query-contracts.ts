import type {
  Folder,
  ImageDownloadSettings,
  MediaType,
  Op,
  Prefs,
  SavedView,
  Source,
  Tag,
  TagGroup,
  VideoDownloadSettings,
} from "@pond/schema/db";
import type { Query } from "@pond/schema/filters/types";
import type { RawJson } from "@pond/schema/raw";
import type { z } from "zod";
import type { assistantSend } from "./assistant";
import type { SystemQueryResults } from "./query-contracts-system";
import type { WirePrefsPatch, WireSave } from "./wire";

interface IdInput {
  id: string;
}
interface IdsInput {
  ids: string[];
}
interface NameInput {
  name: string;
}
interface RenameInput {
  from: string;
  to: string;
}
interface FileInput extends IdInput {
  fileIndex?: number | null;
}
interface FrameInput {
  src: string;
  timeSec: number;
}
interface PathInput {
  path: string;
}
interface ProviderInput {
  provider: string;
}
type EmptyInput = Record<string, never>;
interface SavedViewInput {
  name: string;
  question?: string | null;
  query?: Query | null;
  sortKey?: string;
  sortDir?: string;
  layout?: string | null;
}
interface RetrievalInput {
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
interface DerivedPatch {
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
  autoTitleModel?: string | null;
  suggestedTags?: string[] | null;
  suggestedTagsModel?: string | null;
}
export interface OkResult {
  ok: boolean;
  error?: string;
  reason?: string;
}
interface ImportResult extends OkResult {
  imported: number;
  skipped: number;
}

export interface QueryInputs {
  "saves.get": IdInput;
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
  "saves.retrieve": RetrievalInput;
  "saves.query": {
    query: Query;
    deletedOnly?: boolean;
    sortKey?: string;
    sortDir?: string;
    limit?: number;
  };
  "saves.getMany": IdsInput;
  "saves.rawJson": IdInput;
  "saves.retryFailed": { ids?: string[] };
  "saves.filePath": FileInput;
  "saves.setPhash": { id: string; phash: string | null };
  "saves.getEmbedding": IdInput;
  "saves.setEmbedding": {
    id: string;
    embedding: number[] | null;
    embeddingModel: string | null;
  };
  "saves.patchDerived": { id: string; patch: DerivedPatch };
  "saves.copyImage": FileInput;
  "saves.copyFile": FileInput;
  "saves.copyFiles": { files: FileInput[] };
  "clipboard.writeText": { text: string };
  "saves.publicImageUrl": IdInput;
  "saves.ensureTextCover": { id: string; force?: boolean };
  "saves.mergeDuplicates": { keepId: string; ids: string[] };
  "saves.batchRename": { ids: string[]; pattern: string };
  "saves.pickImportPaths": { kind: "files" | "folders" };
  "saves.classifyUrl": { url: string };
  "saves.importFiles": {
    paths: string[];
    tags?: string[];
    folderIds?: string[];
  };
  "saves.setCustomThumbnail": IdInput;
  "saves.removeCustomThumbnail": IdInput;
  "saves.createManual": {
    title?: string | null;
    url?: string | null;
    note?: string | null;
    tags?: string[];
    filePaths?: string[];
    sourceId?: string | null;
    width?: number;
    height?: number;
  };
  "saves.combineImages": { ids: string[]; folderId?: string | null };
  "saves.importEagleLibrary": { path: string; dryRun?: boolean };
  "saves.startDrag": { id?: string; ids?: string[]; fileIndex?: number | null };
  "saves.quickAdd": { url?: string; note?: string | null; tags?: string[] };
  "saves.extractPageAssets": { url: string };
  "saves.exportFile": FileInput;
  "saves.exportFiles": IdsInput;
  "saves.exportWebp": IdsInput;
  "saves.exportCsv": IdsInput;
  "savedViews.create": SavedViewInput;
  "savedViews.rename": { id: string; name: string };
  "savedViews.update": {
    id: string;
    patch: Partial<SavedViewInput> & { sortOrder?: number };
  };
  "savedViews.delete": IdInput;
  "savedViews.reorder": IdsInput;
  "folders.create": {
    name: string;
    parentId?: string | null;
    color?: string | null;
  };
  "folders.rename": { id: string; name: string };
  "folders.delete": IdInput;
  "folders.setSaveFolders": { saveId: string; folderIds: string[] };
  "folders.addSaves": { folderId: string; saveIds: string[] };
  "tags.create": NameInput;
  "tags.rename": RenameInput;
  "tags.merge": RenameInput;
  "tags.update": {
    name: string;
    patch: { starred?: boolean; description?: string | null };
  };
  "tags.delete": NameInput;
  "tags.convertToGroup": NameInput;
  "tags.setForSave": { saveId: string; tags: string[] };
  "tagGroups.create": { name: string; color?: string | null };
  "tagGroups.rename": RenameInput;
  "tagGroups.update": {
    name: string;
    patch: {
      name?: string;
      description?: string | null;
      color?: string | null;
      sortOrder?: number;
      collapsed?: boolean;
    };
  };
  "tagGroups.delete": NameInput;
  "tagGroups.addTags": { tags: string[]; group: string };
  "tagGroups.removeTag": { tag: string; group: string };
  "settings.setVideoDownload": Partial<VideoDownloadSettings>;
  "settings.setImageDownload": Partial<ImageDownloadSettings>;
  "settings.setPrefs": WirePrefsPatch;
  "accounts.setHandle": { accountId: string; handle: string | null };
  "accounts.setLabel": { accountId: string; label: string | null };
  "accounts.disconnect": { accountId: string };
  "watches.resolve": { source: Source; input: string };
  "watches.add": { source: Source; handle: string; label?: string | null };
  "watches.setLabel": { watchId: string; label: string | null };
  "watches.remove": { watchId: string };
  "video.copyFrame": FrameInput;
  "video.saveFrame": FrameInput;
  "video.setThumbnail": FrameInput & { saveId: string };
  "video.copyFilePath": { saveId: string };
  "preview.pin": IdInput;
  "capture.area": { x: number; y: number; width: number; height: number };
  "autoImport.set": {
    enabled?: boolean;
    path?: string;
    mode?: "copy" | "move";
  };
  "library.createAt": { path: string; name: string };
  "library.switchTo": PathInput;
  "library.move": { path?: string };
  "library.backupTo": { path?: string };
  "downloads.history": {
    limit?: number;
    cursor?: { ts: number; id: number } | null;
    q?: string;
    sources?: Source[];
    ops?: Op[];
  };
  "downloads.live": EmptyInput;
  "sync.history": { source: Source; accountId?: string; limit?: number };
  "sync.recent": { limit?: number };
  "sync.runs": { days?: number };
  "sync.stats": { days?: number };
  "ai.compilePlan": {
    input: string;
    facets: {
      sources: string[];
      types: string[];
      tags: string[];
      creators: string[];
    };
  };
  "agent.saveKey": ProviderInput & { key: string };
  "agent.removeKey": ProviderInput;
  "agent.setKeyEnabled": ProviderInput & { enabled: boolean };
  "agent.verifyKey": ProviderInput & { key: string };
  "agent.listModels": ProviderInput;
  "agent.messages": { chatId: string };
  "agent.deleteChat": { chatId: string };
  "agent.send": z.input<typeof assistantSend>;
  "agent.stop": { chatId: string; requestId: string };
  "agent.searchSaves": RetrievalInput;
  "agent.attachments": IdsInput;
  "agent.review": {
    messageId: string;
    changeIds: string[];
    action: "apply" | "undo" | "dismiss";
  };
  "watches.list": EmptyInput;
  "saves.pickEagleLibrary": EmptyInput;
  "saves.importClipboard": EmptyInput;
  "saves.importBookmarks": EmptyInput;
  "folders.list": EmptyInput;
  "folders.memberships": EmptyInput;
  "settings.get": EmptyInput;
  "settings.ingestToken": EmptyInput;
  "settings.rotateIngestToken": EmptyInput;
  "settings.getOnboarded": EmptyInput;
  "settings.setOnboarded": EmptyInput;
  "settings.getPrefs": EmptyInput;
  "saves.emptyTrash": EmptyInput;
  "saves.restoreAll": EmptyInput;
  "saves.embeddings": EmptyInput;
  "saves.clipEmbeddings": EmptyInput;
  "saves.backfillColors": EmptyInput;
  "saves.findDuplicates": EmptyInput;
  "agent.keys": EmptyInput;
  "agent.listAvailableModels": EmptyInput;
  "agent.chats": EmptyInput;
  "agent.newChat": EmptyInput;
  "agent.mcpSnippet": EmptyInput;
  "library.info": EmptyInput;
  "library.rescan": EmptyInput;
  "library.openInFinder": EmptyInput;
  "library.verifyIntegrity": EmptyInput;
  "reset.preferences": EmptyInput;
  "reset.clearVideoCache": EmptyInput;
  "reset.clearThumbnails": EmptyInput;
  "reset.factory": EmptyInput;
  "storage.snapshot": EmptyInput;
  "storage.applyGuardPrefs": EmptyInput;
  "storage.guardState": EmptyInput;
  "api.restart": EmptyInput;
  "updates.applyPrefs": EmptyInput;
  "updates.checkNow": EmptyInput;
  "quickCapture.applyPrefs": EmptyInput;
  "window.applyPrefs": EmptyInput;
  "collection.open": EmptyInput;
  "capture.screenshot": EmptyInput;
  "capture.display": EmptyInput;
  "capture.window": EmptyInput;
  "capture.selectArea": EmptyInput;
  "capture.cancel": EmptyInput;
  "autoImport.status": EmptyInput;
  "autoImport.pickFolder": EmptyInput;
  "pipeline.status": EmptyInput;
  "pipeline.inflight": EmptyInput;
  "savedViews.list": EmptyInput;
  "accounts.list": EmptyInput;
  "tagGroups.list": EmptyInput;
  "library.pickFolder": EmptyInput;
  "library.pickExisting": EmptyInput;
  "tags.list": EmptyInput;
}

export interface QueryResults extends SystemQueryResults {
  "saves.rawJson": { id: string; rawJson: RawJson | null };
  "saves.emptyTrash": OkResult & { count: number };
  "saves.restoreAll": OkResult & { count: number };
  "saves.retryFailed": OkResult & { requeued: number };
  "saves.filePath": { ok: true; path: string } | { ok: false; reason: string };
  "saves.setPhash": OkResult;
  "saves.embeddings": {
    id: string;
    embedding: null;
    embeddingModel: string | null;
  }[];
  "saves.getEmbedding": {
    id: string;
    embedding: number[] | null;
    embeddingModel: string | null;
  };
  "saves.setEmbedding": OkResult;
  "saves.clipEmbeddings": {
    id: string;
    clipEmbedding: null;
    clipModel: string | null;
  }[];
  "saves.patchDerived": OkResult;
  "saves.copyImage": OkResult;
  "saves.copyFile": OkResult;
  "saves.copyFiles": OkResult & { copied?: number };
  "clipboard.writeText": OkResult;
  "saves.backfillColors": OkResult & { updated: number };
  "saves.publicImageUrl": { ok: boolean; url: string | null };
  "saves.ensureTextCover": OkResult & { captured: number };
  "saves.findDuplicates": { groups: { ids: string[] }[] };
  "saves.mergeDuplicates": OkResult & { trashed: number };
  "saves.batchRename": OkResult & { renamed: number };
  "saves.classifyUrl": { source: Source | null };
  "saves.importFiles": OkResult & { ids?: string[] };
  "saves.setCustomThumbnail": OkResult & { canceled?: boolean };
  "saves.removeCustomThumbnail": OkResult;
  "saves.createManual": OkResult & { id?: string; skipped?: boolean };
  "saves.combineImages": OkResult & {
    id?: string;
    skipped?: number;
    error?: string;
  };
  "saves.importClipboard": OkResult & { ids: string[] };
  "saves.startDrag": OkResult;
  "saves.quickAdd": OkResult & { id?: string; created?: boolean };
  "saves.exportFile": OkResult & { path?: string };
  "saves.exportFiles": OkResult & { exported?: number; dir?: string };
  "saves.exportWebp": OkResult & { exported?: number; dir?: string };
  "saves.exportCsv": OkResult & { count?: number; path?: string };
  "tags.list": Tag[];
  "tags.rename": OkResult & { affected: number };
  "tags.merge": OkResult & { affected: number };
  "tags.update": OkResult;
  "tags.delete": OkResult & { affected: number };
  "tags.convertToGroup": OkResult;
  "tags.setForSave": OkResult;
  "tagGroups.list": (TagGroup & { tagIds: string[]; tagNames: string[] })[];
  "tagGroups.rename": OkResult;
  "tagGroups.update": OkResult;
  "tagGroups.delete": OkResult & { affected: number };
  "tagGroups.addTags": OkResult & { affected: number };
  "tagGroups.removeTag": OkResult;
  "pipeline.status": { paused: boolean; inflight: number };
  "pipeline.inflight": string[];
  "downloads.live": string[];
  "downloads.history": {
    rows: {
      id: number;
      saveId: string;
      title: string | null;
      url: string;
      source: Source;
      outcome: "complete" | "failed" | "cancelled";
      durationMs: number;
      attempts: number;
      failedOp: Op | null;
      error: { name: string; message: string } | null;
      ts: number;
    }[];
    nextCursor: { ts: number; id: number } | null;
  };
  "preview.pin": OkResult;
  "collection.open": OkResult;
  "capture.selectArea": OkResult;
  "capture.cancel": OkResult;
  "capture.screenshot": OkResult & { id?: string };
  "capture.display": OkResult & { id?: string };
  "capture.window": OkResult & { id?: string };
  "capture.area": OkResult & { id?: string };
  "video.copyFrame": OkResult;
  "video.saveFrame": OkResult & { path?: string };
  "video.setThumbnail": OkResult;
  "video.copyFilePath": OkResult;

  "saves.get": WireSave | null;
  "saves.getMany": WireSave[];
  "saves.list": WireSave[];
  "saves.listPage": {
    rows: WireSave[];
    nextCursor: { savedAt: number; id: string } | null;
    total: number | null;
  };
  "saves.query": { ids: string[] };
  "saves.searchFts": { ids: string[]; scores: Record<string, number> };
  "saves.pickImportPaths": { paths: string[] };
  "saves.pickEagleLibrary": { ok: boolean; path: string | null };
  "saves.importBookmarks": ImportResult;
  "saves.extractPageAssets": ImportResult;
  "saves.importEagleLibrary": ImportResult & {
    failed: number;
    deletedSkipped: number;
    lockedFolders: { id: string; name: string }[];
    droppedFields: string[];
  };
  "savedViews.list": SavedView[];
  "savedViews.create": { ok: boolean; id?: string };
  "savedViews.rename": OkResult;
  "savedViews.update": OkResult;
  "savedViews.delete": OkResult;
  "savedViews.reorder": OkResult;
  "folders.list": Folder[];
  "folders.create": Folder;
  "folders.rename": OkResult;
  "folders.delete": OkResult;
  "folders.memberships": { saveId: string; folderId: string }[];
  "folders.setSaveFolders": OkResult;
  "folders.addSaves": OkResult;
  "tags.create": OkResult;
  "tagGroups.create": OkResult;
  "agent.saveKey": OkResult;
  "settings.getPrefs": Prefs;
  "settings.setPrefs": { ok: boolean; prefs: Prefs };
}

export type QueryName = keyof QueryInputs;
export type QueryInput<Name extends QueryName> = QueryInputs[Name];
export type QueryResult<Name extends QueryName> = QueryResults[Name];
export type QueryArguments<Name extends QueryName> =
  EmptyInput extends QueryInput<Name>
    ? [params?: QueryInput<Name>]
    : [params: QueryInput<Name>];
export type QueryClient = <Name extends QueryName>(
  name: Name,
  ...args: QueryArguments<Name>
) => Promise<QueryResult<Name>>;
