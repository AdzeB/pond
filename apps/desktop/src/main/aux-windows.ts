import { BrowserWindow, screen } from "electron";
import log from "electron-log/main.js";
import { resolveMainOut, resolvePreload } from "./lib/resolve-preload";
import { getMainWindow } from "./window";

let previewWindow: BrowserWindow | null = null;
let collectionWindow: BrowserWindow | null = null;
let captureWindow: BrowserWindow | null = null;

function auxOptions(size: { width: number; height: number }) {
  return {
    width: size.width,
    height: size.height,
    alwaysOnTop: true,
    fullscreenable: false,
    skipTaskbar: false,
    autoHideMenuBar: true,
    titleBarStyle: "hiddenInset" as const,
    webPreferences: {
      preload: resolvePreload("index.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  };
}

async function loadShell(win: BrowserWindow, shell: string, extra = "") {
  const search = `shell=${encodeURIComponent(shell)}${extra}`;
  const devUrl = process.env.ELECTRON_RENDERER_URL;
  try {
    if (devUrl) await win.loadURL(`${devUrl}?${search}`);
    else {
      await win.loadFile(resolveMainOut("../renderer/index.html"), {
        query: Object.fromEntries(new URLSearchParams(search)),
      });
    }
  } catch (err) {
    log.warn("[pond] aux window load failed", shell, err);
  }
}

export async function openPreviewWindow(id: string): Promise<void> {
  if (previewWindow && !previewWindow.isDestroyed()) {
    previewWindow.show();
    previewWindow.focus();
    await loadShell(previewWindow, "preview", `&id=${encodeURIComponent(id)}`);
    return;
  }
  const parent = getMainWindow();
  const win = new BrowserWindow({
    ...auxOptions({ width: 640, height: 720 }),
    parent: parent ?? undefined,
  });
  previewWindow = win;
  win.on("closed", () => {
    previewWindow = null;
  });
  await loadShell(win, "preview", `&id=${encodeURIComponent(id)}`);
  win.show();
}

export async function openCollectionWindow(): Promise<void> {
  if (collectionWindow && !collectionWindow.isDestroyed()) {
    collectionWindow.show();
    collectionWindow.focus();
    return;
  }
  const win = new BrowserWindow(auxOptions({ width: 380, height: 460 }));
  collectionWindow = win;
  win.on("closed", () => {
    collectionWindow = null;
  });
  await loadShell(win, "collect");
  win.show();
}

export async function openCaptureWindow(): Promise<void> {
  closeCaptureWindow();
  const bounds = screen.getPrimaryDisplay().bounds;
  const win = new BrowserWindow({
    ...bounds,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    movable: false,
    fullscreenable: false,
    hasShadow: false,
    backgroundColor: "#00000000",
    webPreferences: {
      preload: resolvePreload("index.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  captureWindow = win;
  win.setAlwaysOnTop(true, "screen-saver");
  win.on("closed", () => {
    captureWindow = null;
  });
  await loadShell(win, "capture");
  win.show();
  win.focus();
}

export function closeCaptureWindow(): void {
  if (!captureWindow || captureWindow.isDestroyed()) return;
  captureWindow.close();
  captureWindow = null;
}
