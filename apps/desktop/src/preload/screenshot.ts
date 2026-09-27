import type { Prefs } from "@pond/schema";
import { contextBridge, type IpcRendererEvent, ipcRenderer } from "electron";
import type { IPC as IpcChannels } from "../shared/constants";
import type { QueryClient } from "../shared/query-contracts";
import type {
  SCREENSHOT_WINDOW_IPC as ScreenshotChannels,
  ScreenshotWindowApi,
} from "../shared/screenshot-window-contracts";
import type { SETTINGS_WINDOW_IPC as SettingsChannels } from "../shared/settings-window-contracts";
import type { WireSyncAction } from "../shared/wire";

// Sandboxed preloads cannot require generated sibling chunks. Channel types stay shared; main enforces the query allowlist.
const IPC = {
  query: "pond:query",
  pondId: "pond:pond-id",
  syncAction: "pond:sync-action",
} satisfies Pick<typeof IpcChannels, "query" | "pondId" | "syncAction">;
const SCREENSHOT_WINDOW_IPC = {
  draft: "pond:screenshot-window:draft",
  close: "pond:screenshot-window:close",
  invalidated: "pond:screenshot-window:invalidated",
} satisfies typeof ScreenshotChannels;
const SETTINGS_WINDOW_IPC = {
  prefsChanged: "pond:prefs-changed",
} satisfies Pick<typeof SettingsChannels, "prefsChanged">;
const query: QueryClient = (name, ...args) =>
  ipcRenderer.invoke(IPC.query, name, args[0]);
const api: ScreenshotWindowApi = {
  draft: () => ipcRenderer.invoke(SCREENSHOT_WINDOW_IPC.draft),
  close: () => ipcRenderer.invoke(SCREENSHOT_WINDOW_IPC.close),
  onInvalidated(listener) {
    const handler = (_event: IpcRendererEvent, message: string) =>
      listener(message);
    ipcRenderer.on(SCREENSHOT_WINDOW_IPC.invalidated, handler);
    return () =>
      ipcRenderer.removeListener(SCREENSHOT_WINDOW_IPC.invalidated, handler);
  },
};
contextBridge.exposeInMainWorld("pondScreenshot", api);
contextBridge.exposeInMainWorld("pond", {
  query,
  pondId: (): string => ipcRenderer.sendSync(IPC.pondId),
  onSyncAction(listener: (event: WireSyncAction) => void) {
    const handler = (_event: IpcRendererEvent, value: WireSyncAction) =>
      listener(value);
    ipcRenderer.on(IPC.syncAction, handler);
    return () => ipcRenderer.removeListener(IPC.syncAction, handler);
  },
  onPrefsChanged(listener: (prefs: Prefs) => void) {
    const handler = (_event: IpcRendererEvent, value: Prefs) => listener(value);
    ipcRenderer.on(SETTINGS_WINDOW_IPC.prefsChanged, handler);
    return () =>
      ipcRenderer.removeListener(SETTINGS_WINDOW_IPC.prefsChanged, handler);
  },
});
