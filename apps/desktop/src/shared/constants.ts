import type { ExternalSource } from "@pond/schema/sources";
import type { BlankDocumentKind } from "./blank-documents";

export const DEFAULT_INGEST_PORT = 41610;

export const DEFAULT_LIBRARY_NAME = "My Pond";

export const LIBRARY_SCHEMA_VERSION = 1;

export const KEYCHAIN_SERVICE = "so.pond.desktop";

export const KEYCHAIN_INGEST_TOKEN = "ingest-token";

export const KEYCHAIN_AGENT_PREFIX = "agent";

export const KEYCHAIN_DATABASE_GLOBAL = "database:global";

export const KEYCHAIN_DATABASE_LIBRARY_PREFIX = "database:library";

export const KEYCHAIN_LIBRARY_MASTER_KEY_PREFIX = "library:master";

export const POND_PROTOCOL = "pond";

export const IPC = {
  tx: "pond:tx",
  txBatch: "pond:tx-batch",
  undo: "pond:undo",
  redo: "pond:redo",
  query: "pond:query",
  syncAction: "pond:sync-action",
  appInfo: "pond:app-info",
  rendererReady: "pond:renderer-ready",
  nav: "pond:nav",
  openExternal: "pond:open-external",
  revealSave: "pond:reveal-save",
  openSaveFile: "pond:open-save-file",
  refreshSave: "pond:refresh-save",
  refreshBackfillStart: "pond:refresh-backfill-start",
  refreshBackfillCancel: "pond:refresh-backfill-cancel",
  pipelinePause: "pond:pipeline-pause",
  pipelineCancelSave: "pond:pipeline-cancel-save",
  pipelineCancelAll: "pond:pipeline-cancel-all",
  sourceConnect: "pond:source-connect",
  sourceStatus: "pond:source-status",
  sessionPendingClear: "pond:session-pending-clear",
  sessionImported: "pond:session-imported",
  eagleImportProgress: "pond:eagle-import-progress",
  syncRunNow: "pond:sync-run-now",
  syncStatus: "pond:sync-status",
  syncRunAll: "pond:sync-run-all",
  syncCancel: "pond:sync-cancel",
  governorSetPaused: "pond:governor-set-paused",
  governorResumeSource: "pond:governor-resume-source",
  storageStatus: "pond:storage-status",
  editUndoRequested: "pond:edit-undo-requested",
  editRedoRequested: "pond:edit-redo-requested",
  menuAction: "pond:menu-action",
  pondId: "pond:pond-id",
  menuRecents: "pond:menu-recents",
  menuOpenSave: "pond:menu-open-save",
  archiveNavigate: "pond:archive-navigate",
  archiveBackfillStart: "pond:archive-backfill-start",
  archiveSite: "pond:archive-site",
  agentChunk: "pond:agent-chunk",
  agentStream: "pond:agent-stream",
  agentFilter: "pond:agent-filter",
  agentCite: "pond:agent-cite",
  agentOverlay: "pond:agent-overlay",
  securityState: "pond:security-state",
  previewOpen: "pond:preview-open",
  previewConfigure: "pond:preview-configure",
  previewNavigate: "pond:preview-navigate",
  previewNeighborRequest: "pond:preview-neighbor-request",
  previewClose: "pond:preview-close",
  previewState: "pond:preview-state",
} as const;

export interface RecentMenuEntry {
  id: string;
  title: string;
}

export type BlankDocumentMenuActionId =
  `library.new-blank-${BlankDocumentKind}`;

export type ConnectSourceMenuActionId = `library.connect-${ExternalSource}`;
export type WatchSourceMenuActionId = `library.watch-${ExternalSource}`;

export type MenuActionId =
  | "history.back"
  | "history.forward"
  | "view.inspector.toggle"
  | "view.layout.cycle"
  | "view.zoom-in"
  | "view.zoom-out"
  | "view.zoom-reset"
  | "library.search"
  | "nav.library"
  | "nav.sources"
  | "nav.downloads"
  | "nav.tags"
  | "nav.agent"
  | "nav.trash"
  | "nav.uncategorized"
  | "nav.untagged"
  | "nav.settings"
  | "view.layout.waterfall"
  | "view.layout.grid"
  | "view.layout.justified"
  | "view.layout.list"
  | "theme.light"
  | "theme.dark"
  | "theme.system"
  | "security.lock"
  | "refresh.all"
  | "refresh.cancel"
  | "save.reveal"
  | "save.open-with-default"
  | "save.open-original"
  | "save.copy-url"
  | "save.copy-media"
  | "save.copy-id"
  | "save.rename"
  | "save.add-tag"
  | "save.refresh"
  | "save.trash"
  | "save.untrash"
  | "save.delete-forever"
  | "save.bulk-trash"
  | "save.bulk-refresh"
  | "trash.empty"
  | "trash.restore-all"
  | "library.move"
  | "library.new"
  | "library.open"
  | "library.backup"
  | "library.restore"
  | "library.merge"
  | "library.connect"
  | "library.new-folder"
  | "library.new-smart-folder"
  | "library.new-note"
  | "library.capture-screenshot"
  | "library.new-tag"
  | "library.new-tag-group"
  | "library.import-files"
  | "library.import-folders"
  | "library.import-links"
  | "library.import-clipboard"
  | "library.import-bookmarks"
  | "library.import-page-assets"
  | "library.import-eagle"
  | "library.import-package"
  | "library.watch"
  | ConnectSourceMenuActionId
  | WatchSourceMenuActionId
  | "library.connect-pinterest"
  | BlankDocumentMenuActionId
  | "library.auto-import-folder"
  | "library.auto-import-settings"
  | "library.find-duplicates-all"
  | "library.find-duplicates-list"
  | "library.find-duplicates-selected"
  | "library.rescan"
  | "library.verify-integrity"
  | "view.sidebar.toggle"
  | "view.agent.toggle"
  | "view.grayscale"
  | "view.navigator";
