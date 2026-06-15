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
  refreshSave: "pond:refresh-save",
  refreshBackfillStart: "pond:refresh-backfill-start",
  refreshBackfillCancel: "pond:refresh-backfill-cancel",
  sourceConnect: "pond:source-connect",
  sourceStatus: "pond:source-status",
  syncRunNow: "pond:sync-run-now",
  syncStatus: "pond:sync-status",
  syncRunAll: "pond:sync-run-all",
  syncCancel: "pond:sync-cancel",
  screenshotBackfillRun: "pond:screenshot-backfill-run",
  screenshotBackfillCancel: "pond:screenshot-backfill-cancel",
  screenshotBackfillStatus: "pond:screenshot-backfill-status",
  storageStatus: "pond:storage-status",
  editUndoRequested: "pond:edit-undo-requested",
  editRedoRequested: "pond:edit-redo-requested",
  menuAction: "pond:menu-action",
} as const;

export type MenuActionId =
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
