export const DEFAULT_INGEST_PORT = 41610;

export const DEFAULT_LIBRARY_NAME = "My Pond";

export const LIBRARY_SCHEMA_VERSION = 1;

export const KEYCHAIN_SERVICE = "so.pond.desktop";

export const KEYCHAIN_INGEST_TOKEN = "ingest-token";

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
  openSaveWindow: "pond:open-save-window",
  refreshSave: "pond:refresh-save",
  refreshBackfillStart: "pond:refresh-backfill-start",
  refreshBackfillCancel: "pond:refresh-backfill-cancel",
  refreshBackfillStatus: "pond:refresh-backfill-status",
  sourceConnect: "pond:source-connect",
  sourceDisconnect: "pond:source-disconnect",
  sourceStatus: "pond:source-status",
  videoToolsStatus: "pond:video-tools-status",
  videoToolsReinstall: "pond:video-tools-reinstall",
  videoRedownload: "pond:video-redownload",
  syncRunNow: "pond:sync-run-now",
  syncCancel: "pond:sync-cancel",
  syncStatus: "pond:sync-status",
  syncRunAll: "pond:sync-run-all",
  syncSchedulePeek: "pond:sync-schedule-peek",
  syncSchedulePush: "pond:sync-schedule-push",
  storageStatus: "pond:storage-status",
  editUndoRequested: "pond:edit-undo-requested",
  editRedoRequested: "pond:edit-redo-requested",
  suggestionShow: "pond:suggestion-show",
  suggestionDismiss: "pond:suggestion-dismiss",
  suggestionAct: "pond:suggestion-act",
  suggestionReady: "pond:suggestion-ready",
  suggestionNotify: "pond:suggestion-notify",
  notificationShow: "pond:notification-show",
  processingProgress: "pond:processing-progress",
  menuAction: "pond:menu-action",
} as const;

export type MenuActionId =
  | "palette.open"
  | "find.search"
  | "find.filter"
  | "view.sidebar.toggle"
  | "view.inspector.toggle"
  | "view.layout.cycle"
  | "view.layout.waterfall"
  | "view.layout.grid"
  | "view.layout.justified"
  | "view.layout.list"
  | "theme.light"
  | "theme.dark"
  | "theme.system"
  | "refresh.all"
  | "refresh.cancel"
  | "save.open-detail"
  | "save.reveal"
  | "save.open-with-default"
  | "save.open-original"
  | "save.copy-url"
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
  | "library.export-zip"
  | "library.export-json"
  | "library.move"
  | "developer.restart-api"
  | "developer.open-logs"
  | "developer.ipc-inspector";
