import { contextBridge, ipcRenderer, webUtils } from "electron";
import {
  type ContextMenuTemplateItem,
  IPC,
  type MenuActionId,
  type RecentMenuEntry,
} from "../shared/constants";

export interface RelocatePreviewWire {
  currentPath: string;
  candidatePath: string;
  samePath: boolean;
  safety: { ok: boolean; reason: string | null };
  cloudKind: string | null;
  existing: {
    exists: boolean;
    hasItemsDir: boolean;
    hasMetadataFile: boolean;
    itemCount: number;
    looksLikePondLibrary: boolean;
  };
  suggestedMode: "copy" | "adopt";
}

export interface StorageGuardStatusWire {
  state: "ok" | "warn" | "exceeded";
  pondBytes: number;
  capBytes: number | null;
  warnBytes: number | null;
  action: "warn" | "pauseSync" | "pauseVideo";
  appliedAt: string;
}

// Resolved synchronously once per (re)load so pond-scoped renderer caches can
// namespace their localStorage keys before any module hydrates.
let cachedPondId: string | null = null;

const api = {
  tx(tx: unknown): Promise<unknown> {
    return ipcRenderer.invoke(IPC.tx, tx);
  },

  pondId(): string {
    if (cachedPondId) return cachedPondId;
    try {
      const value = ipcRenderer.sendSync(IPC.pondId) as unknown;
      cachedPondId =
        typeof value === "string" && value.length > 0 ? value : "unbound";
    } catch {
      cachedPondId = "unbound";
    }
    return cachedPondId;
  },

  batch(txs: unknown[]): Promise<unknown[]> {
    return ipcRenderer.invoke(IPC.txBatch, txs);
  },

  undo(): Promise<unknown> {
    return ipcRenderer.invoke(IPC.undo);
  },

  redo(): Promise<unknown> {
    return ipcRenderer.invoke(IPC.redo);
  },

  query(name: string, params?: unknown): Promise<unknown> {
    return ipcRenderer.invoke(IPC.query, name, params);
  },

  // Pop up a native context menu; resolves with the chosen item id or null.
  popupMenu(template: ContextMenuTemplateItem[]): Promise<string | null> {
    return ipcRenderer.invoke(IPC.menuPopup, template);
  },

  // Electron 41 removed File.path. Resolve a dropped/picked File to its
  // absolute path here so the main process can read it without the bytes
  // ever crossing IPC.
  pathForFile(file: File): string {
    return webUtils.getPathForFile(file);
  },

  onSyncAction(cb: (action: unknown) => void): () => void {
    const listener = (_: unknown, action: unknown) => cb(action);
    ipcRenderer.on(IPC.syncAction, listener);
    return () => ipcRenderer.off(IPC.syncAction, listener);
  },

  onNavigate(cb: (path: string) => void): () => void {
    const listener = (_: unknown, path: string) => cb(path);
    ipcRenderer.on(IPC.nav, listener);
    return () => ipcRenderer.off(IPC.nav, listener);
  },

  onEditUndoRequested(cb: () => void): () => void {
    const listener = () => cb();
    ipcRenderer.on(IPC.editUndoRequested, listener);
    return () => ipcRenderer.off(IPC.editUndoRequested, listener);
  },

  onEditRedoRequested(cb: () => void): () => void {
    const listener = () => cb();
    ipcRenderer.on(IPC.editRedoRequested, listener);
    return () => ipcRenderer.off(IPC.editRedoRequested, listener);
  },

  onMenuAction(cb: (id: MenuActionId) => void): () => void {
    const listener = (_: unknown, id: MenuActionId) => cb(id);
    ipcRenderer.on(IPC.menuAction, listener);
    return () => ipcRenderer.off(IPC.menuAction, listener);
  },

  // Push the recently-visited saves so main can render them in the History menu.
  sendMenuRecents(entries: RecentMenuEntry[]): void {
    ipcRenderer.send(IPC.menuRecents, entries);
  },

  onMenuOpenSave(cb: (id: string) => void): () => void {
    const listener = (_: unknown, id: string) => cb(id);
    ipcRenderer.on(IPC.menuOpenSave, listener);
    return () => ipcRenderer.off(IPC.menuOpenSave, listener);
  },

  appInfo(): Promise<{
    name: string;
    version: string;
    platform: string;
    arch: string;
    username: string;
    isPackaged: boolean;
  }> {
    return ipcRenderer.invoke(IPC.appInfo);
  },

  openExternal(url: string): Promise<{ ok: boolean }> {
    return ipcRenderer.invoke(IPC.openExternal, url);
  },

  revealSave(
    id: string,
    fileIndex?: number,
  ): Promise<{ ok: boolean; reason?: string }> {
    return ipcRenderer.invoke(IPC.revealSave, id, fileIndex);
  },

  openSaveFile(
    id: string,
    fileIndex?: number,
  ): Promise<{ ok: boolean; reason?: string }> {
    return ipcRenderer.invoke(IPC.openSaveFile, id, fileIndex);
  },

  refreshSave(id: string): Promise<
    | { ok: true; method: "og" | "hidden-window"; created: boolean }
    | {
        ok: false;
        reason:
          | "not_found"
          | "no_url"
          | "no_metadata"
          | "auth_required"
          | "blocked"
          | "internal_error";
        source?: string;
      }
  > {
    return ipcRenderer.invoke(IPC.refreshSave, id);
  },

  refreshBackfillStart(opts?: {
    source?: string | null;
    onlyMissing?: boolean;
    overwrite?: boolean;
  }): Promise<
    | { ok: true; total: number }
    | { ok: false; reason: "already_running" | "no_saves" }
  > {
    return ipcRenderer.invoke(IPC.refreshBackfillStart, opts ?? {});
  },

  refreshBackfillCancel(): Promise<{ ok: boolean }> {
    return ipcRenderer.invoke(IPC.refreshBackfillCancel);
  },

  // ── Ingest pipeline ─────────────────────────────────────────────────────
  pipelinePause(paused: boolean): Promise<{ ok: true; paused: boolean }> {
    return ipcRenderer.invoke(IPC.pipelinePause, paused);
  },

  pipelineCancelSave(id: string): Promise<{ ok: true; cancelled: boolean }> {
    return ipcRenderer.invoke(IPC.pipelineCancelSave, id);
  },

  pipelineCancelAll(): Promise<{ ok: true; cancelled: number }> {
    return ipcRenderer.invoke(IPC.pipelineCancelAll);
  },

  connectSource(
    source: string,
  ): Promise<{ ok: boolean; mode: "external" | "skipped" }> {
    return ipcRenderer.invoke(IPC.sourceConnect, source);
  },

  sourceStatus(source: string): Promise<{ ok: boolean; connected: boolean }> {
    return ipcRenderer.invoke(IPC.sourceStatus, source);
  },

  syncRunNow(
    source: string,
    opts?: { forceFull?: boolean },
  ): Promise<{ ok: true } | { ok: false; reason: "already_running" }> {
    return ipcRenderer.invoke(IPC.syncRunNow, source, opts);
  },

  syncStatus(source: string): Promise<{
    ok: boolean;
    running: boolean;
    lastSyncedAt: string | null;
    lastError: string | null;
  }> {
    return ipcRenderer.invoke(IPC.syncStatus, source);
  },

  syncRunAll(opts?: { forceFull?: boolean }): Promise<{ ok: true }> {
    return ipcRenderer.invoke(IPC.syncRunAll, opts);
  },

  syncCancel(source: string): Promise<{ ok: true; running: boolean }> {
    return ipcRenderer.invoke(IPC.syncCancel, source);
  },

  onSyncStatus(
    cb: (update: {
      source: string;
      state: "idle" | "running" | "done" | "error" | "auth_required" | "paused";
      message?: string;
      progress?: { current: number; total: number };
      lastSyncedAt?: string | null;
      lastError?: string | null;
    }) => void,
  ): () => void {
    const listener = (_: unknown, update: Parameters<typeof cb>[0]) =>
      cb(update);
    ipcRenderer.on(IPC.syncStatus, listener);
    return () => ipcRenderer.off(IPC.syncStatus, listener);
  },

  onStorageStatus(cb: (status: StorageGuardStatusWire) => void): () => void {
    const listener = (_: unknown, status: StorageGuardStatusWire) => cb(status);
    ipcRenderer.on(IPC.storageStatus, listener);
    return () => ipcRenderer.off(IPC.storageStatus, listener);
  },

  // ── Rate governor (account safety) ──────────────────────────────────────
  governorSetPaused(
    paused: boolean,
  ): Promise<{ ok: true; allPaused: boolean }> {
    return ipcRenderer.invoke(IPC.governorSetPaused, paused);
  },

  governorResumeSource(source: string): Promise<{ ok: true }> {
    return ipcRenderer.invoke(IPC.governorResumeSource, source);
  },
};

interface ShellHint {
  theme?: "light" | "dark";
  baseL?: number;
  baseC?: number;
  baseH?: number;
  accentL?: number;
  accentC?: number;
  accentH?: number;
  contrast?: number;
  fgDir?: number;
  pointerCursors?: boolean;
}

function readShellHint(): ShellHint {
  // Main forwards `--pond-shell=<json>` via additionalArguments; the
  // inline boot script in index.html reads `window.__pondShell` to set
  // theme + pointer cursors before any bundle parses.
  const prefix = "--pond-shell=";
  const arg = process.argv.find((a) => a.startsWith(prefix));
  if (!arg) return {};
  try {
    const parsed = JSON.parse(arg.slice(prefix.length));
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

try {
  contextBridge.exposeInMainWorld("pond", api);
  contextBridge.exposeInMainWorld("__pondShell", readShellHint());
} catch (err) {
  console.error("[pond preload] contextBridge failed", err);
}

export type PondApi = typeof api;
