import { BrowserWindow, screen } from "electron";
import log from "electron-log/main.js";
import type { LibraryQueryRequest } from "../shared/library-query";
import { chooseDisplay } from "./core/screenshot-picker";
import { lockRendererZoom } from "./lib/lock-renderer-zoom";
import { resolveMainOut, resolvePreload } from "./lib/resolve-preload";
import { resolvePaths } from "./paths";
import { getMainWindow } from "./window";

const previewWindows = new Map<string, BrowserWindow>();
const previewNavigation = new Map<
  number,
  { libraryRoot: string; query: LibraryQueryRequest }
>();
let collectionWindow: BrowserWindow | null = null;
let captureWindow: BrowserWindow | null = null;
let captureLibraryRoot: string | null = null;

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

export async function openPreviewWindow(
  id: string,
  navigation?: LibraryQueryRequest,
): Promise<void> {
  const session = navigation
    ? { libraryRoot: resolvePaths().libraryRoot, query: navigation }
    : undefined;
  const previewWindow = previewWindows.get(id);
  if (previewWindow && !previewWindow.isDestroyed()) {
    if (session) previewNavigation.set(previewWindow.webContents.id, session);
    else previewNavigation.delete(previewWindow.webContents.id);
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
  lockRendererZoom(win.webContents);
  previewWindows.set(id, win);
  const webContentsId = win.webContents.id;
  if (session) previewNavigation.set(webContentsId, session);
  win.on("closed", () => {
    previewNavigation.delete(webContentsId);
    previewWindows.delete(id);
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
  const win = new BrowserWindow(auxOptions({ width: 420, height: 720 }));
  lockRendererZoom(win.webContents);
  collectionWindow = win;
  win.on("closed", () => {
    collectionWindow = null;
  });
  await loadShell(win, "collect");
  win.show();
}

export async function openCaptureWindow(): Promise<void> {
  closeCaptureWindow();
  const requestRoot = resolvePaths().libraryRoot;
  const display = await chooseDisplay();
  if (!display || requestRoot !== resolvePaths().libraryRoot) return;
  const bounds = display.bounds;
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
  lockRendererZoom(win.webContents);
  captureWindow = win;
  captureLibraryRoot = requestRoot;
  win.setAlwaysOnTop(true, "screen-saver");
  win.on("closed", () => {
    if (captureWindow === win) {
      captureWindow = null;
      captureLibraryRoot = null;
    }
  });
  await loadShell(win, "capture");
  win.show();
  win.focus();
}

export function closeCaptureWindow(): void {
  if (!captureWindow || captureWindow.isDestroyed()) return;
  captureWindow.close();
  captureWindow = null;
  captureLibraryRoot = null;
}

export function captureWindowBounds() {
  return captureWindow && !captureWindow.isDestroyed()
    ? captureWindow.getBounds()
    : null;
}

export function configurePreviewWindow(
  webContentsId: number,
  input: {
    pinned?: boolean;
    opacity?: number;
    fit?: { width: number; height: number };
  },
) {
  const win = [...previewWindows.values()].find(
    (window) =>
      !window.isDestroyed() && window.webContents.id === webContentsId,
  );
  if (!win) return { ok: false, pinned: false, opacity: 1 };
  if (input.pinned !== undefined) win.setAlwaysOnTop(input.pinned);
  if (input.opacity !== undefined)
    win.setOpacity(Math.min(1, Math.max(0.2, input.opacity)));
  if (input.fit) {
    const display = screen.getDisplayMatching(win.getBounds());
    const ratio = input.fit.width / input.fit.height;
    const available = display.workAreaSize;
    const height = Math.min(available.height - 80, 720);
    const width = Math.min(available.width - 80, Math.max(320, height * ratio));
    win.setContentSize(
      Math.round(width),
      Math.round(Math.min(height, width / ratio) + 80),
    );
  }
  return { ok: true, pinned: win.isAlwaysOnTop(), opacity: win.getOpacity() };
}

export function previewWindowQuery(webContentsId: number) {
  return previewNavigation.get(webContentsId) ?? null;
}
export function captureWindowLibraryRoot(): string | null {
  return captureLibraryRoot;
}
