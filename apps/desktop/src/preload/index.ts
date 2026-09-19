import type { Query } from "@pond/schema/filters/types";
import type { Transaction } from "@pond/schema/tx";
import {
  contextBridge,
  type IpcRendererEvent,
  ipcRenderer,
  webUtils,
} from "electron";
import type { AgentStreamEvent } from "../shared/agent-stream";
import type { AssistantChunk } from "../shared/assistant";
import {
  IPC,
  type MenuActionId,
  type RecentMenuEntry,
} from "../shared/constants";
import { FilterQuery } from "../shared/filter-query";
import type { QueryClient } from "../shared/query-contracts";
import type { EagleImportProgress } from "../shared/saves-import-contracts";
import type {
  WireJson,
  WireSessionImported,
  WireSyncAction,
  WireSyncStatusUpdate,
  WireUndoState,
} from "../shared/wire";

const query: QueryClient = (name, ...args) =>
  ipcRenderer.invoke(IPC.query, name, args[0]);

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

let cachedPondId: string | null = null;

const api = {
  tx(tx: Transaction): Promise<void> {
    return ipcRenderer.invoke(IPC.tx, tx);
  },

  pondId(): string {
    if (cachedPondId) return cachedPondId;
    try {
      const value: string = ipcRenderer.sendSync(IPC.pondId);
      cachedPondId = value.length > 0 ? value : "unbound";
    } catch {
      cachedPondId = "unbound";
    }
    return cachedPondId;
  },

  batch(txs: Transaction[]): Promise<void> {
    return ipcRenderer.invoke(IPC.txBatch, txs);
  },

  undo(): Promise<WireUndoState> {
    return ipcRenderer.invoke(IPC.undo);
  },

  redo(): Promise<WireUndoState> {
    return ipcRenderer.invoke(IPC.redo);
  },

  query,

  rendererReady(): void {
    ipcRenderer.send(IPC.rendererReady);
  },

  /** Electron 41 removed File.path; resolve dropped/picked files here so main can read them without the bytes crossing IPC. */
  pathForFile(file: File): string {
    return webUtils.getPathForFile(file);
  },

  onSyncAction(cb: (action: WireSyncAction) => void): () => void {
    const listener = (_: IpcRendererEvent, action: WireSyncAction) =>
      cb(action);
    ipcRenderer.on(IPC.syncAction, listener);
    return () => ipcRenderer.off(IPC.syncAction, listener);
  },

  onNavigate(cb: (path: string) => void): () => void {
    const listener = (_: IpcRendererEvent, path: string) => cb(path);
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
    const listener = (_: IpcRendererEvent, id: MenuActionId) => cb(id);
    ipcRenderer.on(IPC.menuAction, listener);
    return () => ipcRenderer.off(IPC.menuAction, listener);
  },

  sendMenuRecents(entries: RecentMenuEntry[]): void {
    ipcRenderer.send(IPC.menuRecents, entries);
  },

  onMenuOpenSave(cb: (id: string) => void): () => void {
    const listener = (_: IpcRendererEvent, id: string) => cb(id);
    ipcRenderer.on(IPC.menuOpenSave, listener);
    return () => ipcRenderer.off(IPC.menuOpenSave, listener);
  },

  onEagleImportProgress(
    cb: (progress: EagleImportProgress) => void,
  ): () => void {
    const listener = (_: IpcRendererEvent, progress: EagleImportProgress) =>
      cb(progress);
    ipcRenderer.on(IPC.eagleImportProgress, listener);
    return () => ipcRenderer.off(IPC.eagleImportProgress, listener);
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

  pipelinePause(paused: boolean): Promise<{ ok: true; paused: boolean }> {
    return ipcRenderer.invoke(IPC.pipelinePause, paused);
  },

  pipelineCancelSave(id: string): Promise<{ ok: true; cancelled: boolean }> {
    return ipcRenderer.invoke(IPC.pipelineCancelSave, id);
  },

  pipelineCancelAll(): Promise<{ ok: true; cancelled: number }> {
    return ipcRenderer.invoke(IPC.pipelineCancelAll);
  },

  connectSource(source: string): Promise<{ ok: boolean; mode: "external" }> {
    return ipcRenderer.invoke(IPC.sourceConnect, source);
  },

  clearPendingSession(source?: string): Promise<{ ok: true }> {
    return ipcRenderer.invoke(IPC.sessionPendingClear, source);
  },

  sourceStatus(source: string): Promise<{ ok: boolean; connected: boolean }> {
    return ipcRenderer.invoke(IPC.sourceStatus, source);
  },

  syncRunNow(
    accountId: string,
    opts?: { forceFull?: boolean },
  ): Promise<{ ok: true } | { ok: false; reason: "already_running" }> {
    return ipcRenderer.invoke(IPC.syncRunNow, accountId, opts);
  },

  syncStatus(accountId: string): Promise<{
    ok: boolean;
    running: boolean;
    lastSyncedAt: string | null;
    lastError: string | null;
  }> {
    return ipcRenderer.invoke(IPC.syncStatus, accountId);
  },

  syncRunAll(opts?: { forceFull?: boolean }): Promise<{ ok: true }> {
    return ipcRenderer.invoke(IPC.syncRunAll, opts);
  },

  syncCancel(accountId: string): Promise<{ ok: true; running: boolean }> {
    return ipcRenderer.invoke(IPC.syncCancel, accountId);
  },

  onSessionImported(cb: (payload: WireSessionImported) => void): () => void {
    const listener = (_: IpcRendererEvent, payload: WireSessionImported) =>
      cb(payload);
    ipcRenderer.on(IPC.sessionImported, listener);
    return () => ipcRenderer.off(IPC.sessionImported, listener);
  },

  onSyncStatus(cb: (update: WireSyncStatusUpdate) => void): () => void {
    const listener = (_: IpcRendererEvent, update: WireSyncStatusUpdate) =>
      cb(update);
    ipcRenderer.on(IPC.syncStatus, listener);
    return () => ipcRenderer.off(IPC.syncStatus, listener);
  },

  onStorageStatus(cb: (status: StorageGuardStatusWire) => void): () => void {
    const listener = (_: IpcRendererEvent, status: StorageGuardStatusWire) =>
      cb(status);
    ipcRenderer.on(IPC.storageStatus, listener);
    return () => ipcRenderer.off(IPC.storageStatus, listener);
  },

  governorSetPaused(
    paused: boolean,
  ): Promise<{ ok: true; allPaused: boolean }> {
    return ipcRenderer.invoke(IPC.governorSetPaused, paused);
  },

  governorResumeSource(source: string): Promise<{ ok: true }> {
    return ipcRenderer.invoke(IPC.governorResumeSource, source);
  },

  onArchiveNavigate(
    cb: (payload: { guestId: number; url: string }) => void,
  ): () => void {
    const listener = (
      _: IpcRendererEvent,
      payload: { guestId: number; url: string },
    ) => cb(payload);
    ipcRenderer.on(IPC.archiveNavigate, listener);
    return () => ipcRenderer.off(IPC.archiveNavigate, listener);
  },

  archiveBackfillStart(): Promise<{ ok: true; queued: number }> {
    return ipcRenderer.invoke(IPC.archiveBackfillStart);
  },
  archiveSite(id: string): Promise<{ ok: boolean }> {
    return ipcRenderer.invoke(IPC.archiveSite, id);
  },

  onAgentChunk(cb: (chunk: AssistantChunk) => void): () => void {
    const listener = (_: IpcRendererEvent, chunk: AssistantChunk) => cb(chunk);
    ipcRenderer.on(IPC.agentChunk, listener);
    return () => ipcRenderer.off(IPC.agentChunk, listener);
  },

  agentStream(
    body: WireJson,
    receive: (event: AgentStreamEvent) => void,
  ): () => void {
    const { port1, port2 } = new MessageChannel();
    let closed = false;
    const close = () => {
      if (closed) return;
      closed = true;
      port1.onmessage = null;
      port1.onmessageerror = null;
      port1.close();
    };
    port1.onmessage = (event) => {
      if (closed) return;
      const chunk = event.data;
      if (chunk instanceof Uint8Array) {
        receive({ type: "data", data: Array.from(chunk) });
      } else if (chunk instanceof ArrayBuffer) {
        receive({ type: "data", data: Array.from(new Uint8Array(chunk)) });
      }
    };
    port1.addEventListener("close", () => {
      if (closed) return;
      close();
      receive({ type: "end" });
    });
    port1.onmessageerror = () => {
      close();
      receive({ type: "error", error: "Could not read this reply." });
    };
    try {
      ipcRenderer.postMessage(IPC.agentStream, body, [port2]);
    } catch (error) {
      close();
      port2.close();
      throw error;
    }
    return close;
  },

  onAgentFilter(cb: (query: Query) => void): () => void {
    const listener = (_: IpcRendererEvent, query: WireJson) => {
      const parsed = FilterQuery.safeParse(query);
      if (parsed.success) cb(parsed.data);
    };
    ipcRenderer.on(IPC.agentFilter, listener);
    return () => ipcRenderer.off(IPC.agentFilter, listener);
  },

  onAgentCite(cb: (ids: string[]) => void): () => void {
    const listener = (_: IpcRendererEvent, ids: string[]) => cb(ids);
    ipcRenderer.on(IPC.agentCite, listener);
    return () => ipcRenderer.off(IPC.agentCite, listener);
  },

  onAgentOverlay(
    cb: (overlay: {
      semanticQuery?: string | null;
      visualSaveId?: string | null;
    }) => void,
  ): () => void {
    const listener = (
      _: IpcRendererEvent,
      overlay: {
        semanticQuery?: string | null;
        visualSaveId?: string | null;
      },
    ) => cb(overlay);
    ipcRenderer.on(IPC.agentOverlay, listener);
    return () => ipcRenderer.off(IPC.agentOverlay, listener);
  },
};

interface ShellHint {
  theme?: "light" | "dark";
  bgL?: number;
  bgC?: number;
  bgH?: number;
  fgL?: number;
  fgC?: number;
  fgH?: number;
  accentL?: number;
  accentC?: number;
  accentH?: number;
  contrast?: number;
  background?: string;
  pointerCursors?: boolean;
}

function readShellHint(): ShellHint {
  const prefix = "--pond-shell=";
  const arg = process.argv.find((a) => a.startsWith(prefix));
  if (!arg) return {};
  try {
    const parsed: ShellHint | null = JSON.parse(arg.slice(prefix.length));
    return parsed ?? {};
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
