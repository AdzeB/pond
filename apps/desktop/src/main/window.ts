import type { BrowserWindowConstructorOptions } from "electron";
import { app, BrowserWindow, nativeTheme, shell } from "electron";
import log from "electron-log/main.js";
import { DEFAULT_APP_ICON } from "../shared/app-icons";
import { IPC } from "../shared/constants";
import { attachEditableContextMenu } from "./context-menu";
import { hardenArchiveWebviews } from "./core/archive-viewer";
import { getPrefs, setPrefs } from "./core/prefs";
import { openSettingsWindow } from "./core/settings-window";
import { consumePendingDeepLink } from "./deep-link";
import { lockRendererZoom } from "./lib/lock-renderer-zoom";
import { resolveMainOut, resolvePreload } from "./lib/resolve-preload";
import { resolveTheme } from "./theme";
import { ensureTray, type TrayHandle } from "./tray";

import { mainWindowState } from "./window-state";

let tray: TrayHandle | null = null;
let trayRefreshQueued = false;
let closeToTrayEnabled = false;
let isQuitting = false;
let nativeThemeListenerAttached = false;

const MIN_WINDOW_WIDTH = 720;
const MIN_WINDOW_HEIGHT = 480;

function usableWindowBounds(
  bounds: { x: number; y: number; width: number; height: number } | null,
): { x: number; y: number; width: number; height: number } | null {
  if (!bounds) return null;
  if (bounds.width < MIN_WINDOW_WIDTH || bounds.height < MIN_WINDOW_HEIGHT) {
    return null;
  }
  return bounds;
}

export function getMainWindow(): BrowserWindow | null {
  return mainWindowState.current;
}

export function hasTray(): boolean {
  return tray !== null;
}

export function beginQuit(): void {
  isQuitting = true;
}

export function setCloseToTray(enabled: boolean): void {
  closeToTrayEnabled = enabled;
}

export function queueTrayRefresh(): void {
  if (!tray || trayRefreshQueued) return;
  trayRefreshQueued = true;
  setTimeout(() => {
    trayRefreshQueued = false;
    void tray?.refresh();
  }, 150);
}

function navigateMain(route: string): void {
  mainWindowState.current?.webContents.send(IPC.nav, route);
}

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

export async function syncShellChrome(): Promise<void> {
  const win = mainWindowState.current;
  if (!win || win.isDestroyed()) return;

  const resolved = await resolveTheme();
  const background =
    resolved?.background ??
    (resolved?.mode === "dark" || (!resolved && nativeTheme.shouldUseDarkColors)
      ? "#000000"
      : "#ffffff");

  win.setBackgroundColor(background);
}

async function resolveShellHint(): Promise<ShellHint> {
  const resolved = await resolveTheme();
  if (!resolved) return {};
  const { mode, ...vars } = resolved;
  const prefs = await getPrefs().catch(() => null);
  return {
    theme: mode,
    ...vars,
    pointerCursors: prefs?.preferences.pointerCursors === true,
  };
}

let openingLibraryWindow: Promise<BrowserWindow> | null = null;

export function createWindow(): Promise<BrowserWindow> {
  if (!openingLibraryWindow) {
    openingLibraryWindow = buildLibraryWindow().finally(() => {
      openingLibraryWindow = null;
    });
  }
  return openingLibraryWindow;
}

async function buildLibraryWindow(): Promise<BrowserWindow> {
  const isMac = process.platform === "darwin";

  const shellHint = await resolveShellHint();
  const prefs = await getPrefs().catch(() => null);
  const restored = usableWindowBounds(
    prefs?.window.restorePosition ? (prefs.window.bounds ?? null) : null,
  );

  const themedBackground =
    shellHint.background ||
    (shellHint.theme === "dark" ||
    (shellHint.theme !== "light" && nativeTheme.shouldUseDarkColors)
      ? "#000000"
      : "#ffffff");

  const { applyAppIcon, resolveAppIconPath } = await import("./core/app-icon");
  const appIcon = resolveAppIconPath(prefs?.window.appIcon ?? DEFAULT_APP_ICON);

  const options: BrowserWindowConstructorOptions = {
    width: restored?.width ?? 1280,
    height: restored?.height ?? 800,
    x: restored?.x,
    y: restored?.y,
    minWidth: MIN_WINDOW_WIDTH,
    minHeight: MIN_WINDOW_HEIGHT,
    show: false,
    fullscreenable: false,
    backgroundColor: themedBackground,
    autoHideMenuBar: true,
    titleBarStyle: isMac ? "hiddenInset" : "default",
    trafficLightPosition: isMac ? { x: 16, y: 15 } : undefined,
    webPreferences: {
      preload: resolvePreload("index.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      backgroundThrottling: true,
      webviewTag: true,
      additionalArguments: [`--pond-shell=${JSON.stringify(shellHint)}`],
    },
  };
  if (!isMac && appIcon) options.icon = appIcon;

  const win = new BrowserWindow(options);
  mainWindowState.current = win;
  win.once("closed", () => {
    if (mainWindowState.current === win) mainWindowState.current = null;
  });
  lockRendererZoom(win.webContents);

  hardenArchiveWebviews(win);
  attachEditableContextMenu(win.webContents);

  win.on("ready-to-show", () => {
    win.show();
  });

  let saveBoundsTimer: NodeJS.Timeout | null = null;
  const saveBounds = () => {
    if (win.isDestroyed()) return;
    if (saveBoundsTimer) clearTimeout(saveBoundsTimer);
    saveBoundsTimer = setTimeout(() => {
      saveBoundsTimer = null;
      const b = usableWindowBounds(win.getBounds());
      if (!b) return;
      void setPrefs({ window: { bounds: b } }).catch((err) =>
        log.warn("[pond] persist window bounds failed", err),
      );
    }, 400);
  };
  win.on("resize", saveBounds);
  win.on("move", saveBounds);

  win.on("close", (event) => {
    if (isQuitting) return;
    if (!closeToTrayEnabled) return;
    if (!tray) return;
    if (win.isDestroyed()) return;
    if (mainWindowState.current !== win) return;
    event.preventDefault();
    win.hide();
    if (process.platform === "darwin") app.dock?.hide();
  });

  win.webContents.on("did-finish-load", () => {
    if (win.isDestroyed()) return;
    const route = consumePendingDeepLink();
    if (route) {
      win.webContents.send(IPC.nav, route);
    }
  });

  win.webContents.on(
    "did-fail-load",
    (_event, code, desc, url, isMainFrame) => {
      if (!isMainFrame) return;
      log.error("[pond] renderer did-fail-load", { code, desc, url });
    },
  );

  win.webContents.on("render-process-gone", (_event, details) => {
    log.error("[pond] renderer gone", details);
  });

  win.webContents.on("console-message", (event) => {
    const level = event.level;
    if (level !== "warning" && level !== "error") return;
    log.warn("[pond renderer]", event.message);
  });

  win.webContents.setWindowOpenHandler(({ url }) => {
    /** Only hand http(s) to the OS; other schemes via openExternal are an RCE vector. */
    const isHttp = (() => {
      try {
        const u = new URL(url);
        return u.protocol === "http:" || u.protocol === "https:";
      } catch {
        return false;
      }
    })();
    if (isHttp) void shell.openExternal(url);
    else log.warn("[pond] blocked window.open for non-http(s) URL", url);
    return { action: "deny" };
  });

  const devUrl = process.env.ELECTRON_RENDERER_URL;

  win.webContents.on("will-navigate", (event, url) => {
    const allowed = (() => {
      if (devUrl && url.startsWith(devUrl)) return true;
      if (url.startsWith("file://")) return true;
      if (url.startsWith("pond://")) return true;
      if (url === "about:blank") return true;
      return false;
    })();
    if (!allowed) {
      event.preventDefault();
      log.warn("[pond] blocked navigation away from trusted origin", url);
      const u = (() => {
        try {
          return new URL(url);
        } catch {
          return null;
        }
      })();
      if (u && (u.protocol === "http:" || u.protocol === "https:")) {
        void shell.openExternal(u.toString());
      }
    }
  });
  if (devUrl) {
    await win.loadURL(devUrl);
    if (
      process.env.POND_OPEN_DEVTOOLS === "1" ||
      process.env.POND_DEVTOOLS === "1"
    ) {
      win.webContents.openDevTools({ mode: "detach" });
    }
  } else {
    await win.loadFile(resolveMainOut("../renderer/index.html"));
  }

  void applyAppIcon(prefs?.window.appIcon);

  if (!nativeThemeListenerAttached) {
    nativeThemeListenerAttached = true;
    nativeTheme.on("updated", () => {
      void syncShellChrome();
    });
  }

  return win;
}

async function ensureMainWindow(): Promise<BrowserWindow> {
  if (openingLibraryWindow) return openingLibraryWindow;
  if (!mainWindowState.current || mainWindowState.current.isDestroyed()) {
    return createWindow();
  }
  return mainWindowState.current;
}

export async function openLibraryWindow(): Promise<void> {
  const win = await ensureMainWindow();
  if (win.isMinimized()) win.restore();
  win.show();
  win.focus();
}

export async function handleActivate(): Promise<void> {
  if (process.platform === "darwin") app.dock?.show();
  await openLibraryWindow();
}

export function focusedOrMain(): BrowserWindow | null {
  const target = mainWindowState.current;
  if (!target || target.isDestroyed()) return null;
  if (target.isMinimized()) target.restore();
  target.show();
  target.focus();
  return target;
}

export async function summonMainWindow(): Promise<void> {
  const win = await ensureMainWindow();
  if (win.isMinimized()) win.restore();
  win.show();
  win.focus();
}

export async function initTray(): Promise<void> {
  try {
    tray = await ensureTray({
      onOpenLibrary: openLibraryWindow,
      onOpenSettings: () => openSettingsWindow(),
      onOpenDownloads: async () => {
        await openLibraryWindow();
        navigateMain("/downloads");
      },
      onMenuAction: async (id) => {
        if (id === "library.capture-screenshot") {
          const { launchScreenshotTool } = await import(
            "./core/screenshot-tools"
          );
          const result = await launchScreenshotTool(
            (await getPrefs()).screenshots.tool,
          );
          if (result.openPondCapture) {
            const { beginScreenshot } = await import(
              "./core/screenshot-window"
            );
            await beginScreenshot("area");
          }
          return;
        }
        await openLibraryWindow();
        mainWindowState.current?.webContents.send(IPC.menuAction, id);
      },
    });
  } catch (err) {
    log.error(
      "[pond] failed to create tray; menu-bar icon will be unavailable",
      err,
    );
  }
}
