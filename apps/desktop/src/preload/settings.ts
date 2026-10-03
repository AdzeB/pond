import type { Prefs } from "@pond/schema";
import { contextBridge, type IpcRendererEvent, ipcRenderer } from "electron";

const IPC = {
  query: "pond:query",
  pondId: "pond:pond-id",
  openExternal: "pond:open-external",
} as const;

import type { QueryClient } from "../shared/query-contracts";
import type {
  SettingsProcessingStatus,
  SettingsWindowLocation,
} from "../shared/settings-window-contracts";

const SETTINGS_WINDOW_IPC = {
  open: "pond:settings-window-open",
  location: "pond:settings-window-location",
  ready: "pond:settings-window-ready",
  close: "pond:settings-window-close",
  processingReady: "pond:settings-processing-ready",
  processingCheck: "pond:settings-processing-check",
  processingStatus: "pond:settings-processing-status",
  prefsChanged: "pond:prefs-changed",
} as const;

const query: QueryClient = (name, ...args) => {
  return ipcRenderer.invoke(IPC.query, name, args[0]);
};
const api = {
  query,
  pondId(): string {
    return ipcRenderer.sendSync(IPC.pondId);
  },
  openExternal(url: string): Promise<{ ok: boolean }> {
    return ipcRenderer.invoke(IPC.openExternal, url);
  },
  openSettingsWindow(input: SettingsWindowLocation = {}): Promise<void> {
    return ipcRenderer.invoke(SETTINGS_WINDOW_IPC.open, input);
  },
  onPrefsChanged(callback: (prefs: Prefs) => void): () => void {
    const listener = (_event: IpcRendererEvent, prefs: Prefs) =>
      callback(prefs);
    ipcRenderer.on(SETTINGS_WINDOW_IPC.prefsChanged, listener);
    return () => ipcRenderer.off(SETTINGS_WINDOW_IPC.prefsChanged, listener);
  },
};
const settingsApi = {
  checkLibrary(): Promise<void> {
    return ipcRenderer.invoke(SETTINGS_WINDOW_IPC.processingCheck);
  },
  onProcessingStatus(
    callback: (status: SettingsProcessingStatus) => void,
  ): () => void {
    const listener = (
      _event: IpcRendererEvent,
      status: SettingsProcessingStatus,
    ) => callback(status);
    ipcRenderer.on(SETTINGS_WINDOW_IPC.processingStatus, listener);
    return () =>
      ipcRenderer.off(SETTINGS_WINDOW_IPC.processingStatus, listener);
  },
  ready(): Promise<SettingsWindowLocation> {
    return ipcRenderer.invoke(SETTINGS_WINDOW_IPC.ready);
  },
  close(): Promise<void> {
    return ipcRenderer.invoke(SETTINGS_WINDOW_IPC.close);
  },
  onLocation(callback: (location: SettingsWindowLocation) => void): () => void {
    const listener = (
      _event: IpcRendererEvent,
      location: SettingsWindowLocation,
    ) => callback(location);
    ipcRenderer.on(SETTINGS_WINDOW_IPC.location, listener);
    return () => ipcRenderer.off(SETTINGS_WINDOW_IPC.location, listener);
  },
};
contextBridge.exposeInMainWorld("pond", api);
contextBridge.exposeInMainWorld("pondSettings", settingsApi);
export type PondSettingsApi = typeof settingsApi;
