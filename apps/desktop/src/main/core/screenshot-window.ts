import {
  BrowserWindow,
  type Display,
  ipcMain,
  nativeTheme,
  screen,
} from "electron";
import log from "electron-log/main.js";
import { IPC } from "../../shared/constants";
import type {
  ScreenshotCaptureResult,
  ScreenshotMode,
  ScreenshotSaveInput,
} from "../../shared/screenshot-capture";
import { SCREENSHOT_WINDOW_IPC } from "../../shared/screenshot-window-contracts";
import {
  detachedWindowChrome,
  detachedWindowTitle,
} from "../lib/detached-window-chrome";
import { resolveMainOut, resolvePreload } from "../lib/resolve-preload";
import { mainWindowState } from "../window-state";
import { getPrefs } from "./prefs";
import { screenshotCapture } from "./screenshot-capture";
import { restoreScreenshotOrigin, screenshotOrigin } from "./screenshot-focus";
import { createScreenshotWorkflow } from "./screenshot-workflow";

let organizer: BrowserWindow | null = null;
let captureDisplay: Display | null = null;
let openLibraryWindow: (() => Promise<void>) | undefined;

export function screenshotWindowOwnsSender(id: number): boolean {
  return (
    organizer !== null &&
    !organizer.isDestroyed() &&
    organizer.webContents.id === id
  );
}

export function closeScreenshotWindow(): void {
  workflow.shutdown();
}

async function afterSaving(id: string, origin: number | null): Promise<void> {
  if ((await getPrefs()).screenshots.afterSaving === "return") {
    await restoreScreenshotOrigin(origin);
    return;
  }
  if (!openLibraryWindow) throw new Error("Screenshot windows are not ready.");
  await openLibraryWindow();
  const window = mainWindowState.current;
  if (!window || window.isDestroyed()) return;
  window.webContents.send(IPC.nav, `/save/${encodeURIComponent(id)}`);
}

async function openOrganizer(display: Display): Promise<void> {
  const area = display.workArea;
  const width = Math.min(760, area.width);
  const height = Math.min(580, area.height);
  const window = new BrowserWindow({
    ...detachedWindowChrome(),
    width,
    height,
    x: Math.round(area.x + (area.width - width) / 2),
    y: Math.round(area.y + (area.height - height) / 2),
    minWidth: Math.min(560, area.width),
    minHeight: Math.min(480, area.height),
    title: detachedWindowTitle("Save Screenshot"),
    show: false,
    resizable: true,
    backgroundColor: nativeTheme.shouldUseDarkColors ? "#000000" : "#ffffff",
    autoHideMenuBar: true,
    webPreferences: {
      preload: resolvePreload("screenshot.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  organizer = window;
  window.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  window.webContents.on("will-navigate", (event) => event.preventDefault());
  window.on("close", (event) => {
    if (screenshotCapture.isBusy()) {
      event.preventDefault();
      return;
    }
    void workflow
      .close()
      .catch((error) => log.warn("[screenshot] close failed", error));
  });
  const timer = setInterval(() => {
    if (
      !window.isDestroyed() &&
      !screenshotCapture.isBusy() &&
      !screenshotCapture.draft()
    ) {
      window.webContents.send(
        SCREENSHOT_WINDOW_IPC.invalidated,
        "This screenshot expired. Close this window and take it again.",
      );
      clearInterval(timer);
    }
  }, 1000);
  timer.unref();
  window.on("closed", () => {
    clearInterval(timer);
    if (organizer === window) organizer = null;
  });
  const dev = process.env.ELECTRON_RENDERER_URL;
  try {
    if (dev) await window.loadURL(`${dev}/screenshot.html`);
    else await window.loadFile(resolveMainOut("../renderer/screenshot.html"));
    if (!window.isDestroyed()) {
      window.show();
      window.focus();
    }
  } catch (error) {
    if (!window.isDestroyed()) window.destroy();
    throw error;
  }
}

const workflow = createScreenshotWorkflow({
  capture: screenshotCapture,
  async prepare() {
    captureDisplay = screen.getDisplayNearestPoint(
      screen.getCursorScreenPoint(),
    );
    return screenshotOrigin();
  },
  focus() {
    if (!organizer || organizer.isDestroyed()) return false;
    if (organizer.isMinimized()) organizer.restore();
    organizer.show();
    organizer.focus();
    return true;
  },
  open: () => openOrganizer(captureDisplay ?? screen.getPrimaryDisplay()),
  destroy() {
    const window = organizer;
    organizer = null;
    if (window && !window.isDestroyed()) window.destroy();
  },
  restore: restoreScreenshotOrigin,
  afterSave: (id, origin) =>
    afterSaving(id, origin).catch((error) =>
      log.warn("[screenshot] reveal failed", error),
    ),
});

export const beginScreenshot = (
  mode: ScreenshotMode,
): Promise<ScreenshotCaptureResult> => workflow.begin(mode);
export const finishScreenshot = (
  input: ScreenshotSaveInput,
): Promise<{ id: string }> => workflow.finish(input);

export function registerScreenshotWindowIpc(options: {
  openLibraryWindow(): Promise<void>;
}): void {
  openLibraryWindow = options.openLibraryWindow;
  ipcMain.handle(SCREENSHOT_WINDOW_IPC.draft, (event) => {
    if (!screenshotWindowOwnsSender(event.sender.id))
      throw new Error("Screenshot window is unavailable.");
    return screenshotCapture.draft();
  });
  ipcMain.handle(SCREENSHOT_WINDOW_IPC.close, (event) => {
    if (!screenshotWindowOwnsSender(event.sender.id))
      throw new Error("Screenshot window is unavailable.");
    organizer?.close();
  });
}
