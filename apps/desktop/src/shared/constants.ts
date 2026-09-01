export const DEFAULT_INGEST_PORT = 41610;

export const DEFAULT_LIBRARY_NAME = "My Pond";

export const LIBRARY_SCHEMA_VERSION = 1;

export const KEYCHAIN_SERVICE = "so.pond.desktop";

export const KEYCHAIN_INGEST_TOKEN = "ingest-token";

export const KEYCHAIN_AGENT_PREFIX = "agent";

export const POND_PROTOCOL = "pond";

export const IPC = {
  tx: "pond:tx",
  txBatch: "pond:tx-batch",
  undo: "pond:undo",
  redo: "pond:redo",
  query: "pond:query",
  syncAction: "pond:sync-action",
  appInfo: "pond:app-info",
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
  agentFilter: "pond:agent-filter",
  agentCite: "pond:agent-cite",
} as const;

export interface RecentMenuEntry {
  id: string;
  title: string;
}

export type MenuActionId =
  | "history.back"
  | "history.forward"
  | "view.inspector.toggle"
  | "view.layout.cycle"
  | "view.zoom-in"
  | "view.zoom-out"
  | "view.zoom-reset"
  | "library.search"
  | "help.shortcuts"
  | "view.layout.waterfall"
  | "view.layout.grid"
  | "view.layout.justified"
  | "view.layout.list"
  | "theme.light"
  | "theme.dark"
  | "theme.system"
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
  | "library.connect"
  | "view.sidebar.toggle"
  | "view.agent.toggle";
