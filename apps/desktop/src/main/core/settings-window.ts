import { BrowserWindow, nativeTheme, screen, type WebContents } from "electron";
import {
  SETTINGS_WINDOW_IPC,
  type SettingsProcessingStatus,
  SettingsProcessingStatusSchema,
  type SettingsWindowLocation,
  SettingsWindowLocationSchema,
} from "../../shared/settings-window-contracts";
import { attachEditableContextMenu } from "../context-menu";
import { safeHandle } from "../ipc/helpers";
import {
  detachedWindowChrome,
  detachedWindowTitle,
} from "../lib/detached-window-chrome";
import { lockRendererZoom } from "../lib/lock-renderer-zoom";
import { resolveMainOut, resolvePreload } from "../lib/resolve-preload";
import { mainWindowState } from "../window-state";
import { subscribePrefs } from "./prefs";

const settingsReady = Promise.withResolvers<void>();

let processingSender: WebContents | null = null;
let pendingCheck = false;
let processingStatus: SettingsProcessingStatus = {
  inflight: 0,
  activeKeys: [],
  failedKeys: [],
};
let settingsWindow: BrowserWindow | null = null;
let opening: Promise<void> | null = null;
let location: SettingsWindowLocation = {};

export function settingsWindowOwnsSender(id: number): boolean {
  return settingsWindow?.webContents.id === id;
}

export async function openSettingsWindow(
  next: SettingsWindowLocation = {},
): Promise<void> {
  if (next.section !== undefined || next.hash !== undefined) location = next;
  await settingsReady.promise;
  if (opening) await opening;
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    if (settingsWindow.isMinimized()) settingsWindow.restore();
    settingsWindow.webContents.send(SETTINGS_WINDOW_IPC.location, location);
    settingsWindow.show();
    settingsWindow.focus();
    return;
  }
  opening = createSettingsWindow().finally(() => {
    opening = null;
  });
  await opening;
}

async function createSettingsWindow(): Promise<void> {
  const display = screen.getDisplayNearestPoint(
    screen.getCursorScreenPoint(),
  ).workArea;
  const width = Math.min(960, display.width);
  const height = Math.min(760, display.height);
  const win = new BrowserWindow({
    ...detachedWindowChrome(),
    title: detachedWindowTitle("Settings"),
    width,
    height,
    x: display.x + Math.round((display.width - width) / 2),
    y: display.y + Math.round((display.height - height) / 2),
    minWidth: Math.min(720, width),
    minHeight: Math.min(480, height),
    show: false,
    autoHideMenuBar: true,
    backgroundColor: nativeTheme.shouldUseDarkColors ? "#000000" : "#ffffff",
    webPreferences: {
      preload: resolvePreload("settings.cjs"),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
    },
  });
  settingsWindow = win;
  lockRendererZoom(win.webContents);
  attachEditableContextMenu(win.webContents);
  win.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  win.webContents.on("will-navigate", (event) => event.preventDefault());
  win.once("ready-to-show", () => {
    win.show();
    win.focus();
  });
  win.once("closed", () => {
    if (settingsWindow === win) settingsWindow = null;
  });
  const devUrl = process.env.ELECTRON_RENDERER_URL;
  try {
    if (devUrl)
      await win.loadURL(new URL("settings.html", `${devUrl}/`).toString());
    else await win.loadFile(resolveMainOut("../renderer/settings.html"));
  } catch (error) {
    win.destroy();
    throw error;
  }
}

export function registerSettingsWindowIpc({
  openLibraryWindow,
}: {
  openLibraryWindow: () => Promise<void>;
}): void {
  safeHandle(SETTINGS_WINDOW_IPC.processingReady, (event) => {
    if (event.sender !== mainWindowState.current?.webContents)
      throw new Error("Only the Library can own processing");
    const sender = event.sender;
    if (processingSender !== sender) {
      sender.once("destroyed", () => {
        if (processingSender !== sender) return;
        processingSender = null;
        processingStatus = { inflight: 0, activeKeys: [], failedKeys: [] };
        settingsWindow?.webContents.send(
          SETTINGS_WINDOW_IPC.processingStatus,
          processingStatus,
        );
      });
    }
    processingSender = sender;
    if (pendingCheck) {
      pendingCheck = false;
      sender.send(SETTINGS_WINDOW_IPC.processingCheck);
    }
  });
  safeHandle(
    SETTINGS_WINDOW_IPC.processingStatus,
    (event, input: SettingsProcessingStatus) => {
      if (event.sender !== processingSender)
        throw new Error("Only the Library can publish processing status");
      processingStatus = SettingsProcessingStatusSchema.parse(input);
      settingsWindow?.webContents.send(
        SETTINGS_WINDOW_IPC.processingStatus,
        processingStatus,
      );
    },
  );
  safeHandle(SETTINGS_WINDOW_IPC.processingCheck, async (event) => {
    if (!settingsWindowOwnsSender(event.sender.id))
      throw new Error("Not a Settings window");
    pendingCheck = true;
    await openLibraryWindow();
    if (pendingCheck && processingSender && !processingSender.isDestroyed()) {
      pendingCheck = false;
      processingSender.send(SETTINGS_WINDOW_IPC.processingCheck);
    }
  });
  safeHandle(
    SETTINGS_WINDOW_IPC.open,
    async (_event, input: SettingsWindowLocation) => {
      await openSettingsWindow(SettingsWindowLocationSchema.parse(input));
    },
  );
  safeHandle(SETTINGS_WINDOW_IPC.ready, (event) => {
    if (!settingsWindowOwnsSender(event.sender.id))
      throw new Error("Not a Settings window");
    event.sender.send(SETTINGS_WINDOW_IPC.processingStatus, processingStatus);
    return location;
  });
  safeHandle(SETTINGS_WINDOW_IPC.close, (event) => {
    if (!settingsWindowOwnsSender(event.sender.id))
      throw new Error("Not a Settings window");
    settingsWindow?.close();
  });
  settingsReady.resolve();
  subscribePrefs((prefs) => {
    for (const win of BrowserWindow.getAllWindows()) {
      if (!win.isDestroyed())
        win.webContents.send(SETTINGS_WINDOW_IPC.prefsChanged, prefs);
    }
  });
}
