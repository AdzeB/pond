import { join } from "node:path";
import { app, BrowserWindow, shell } from "electron";
import log from "electron-log/main.js";
import { IPC } from "../shared/constants";
import { attachEditableContextMenu } from "./context-menu";
import { hardenArchiveWebviews } from "./core/archive-viewer";
import { getPrefs, setPrefs } from "./core/prefs";
import { consumePendingDeepLink } from "./deep-link";
import { resolveTheme } from "./theme";
import { ensureTray, type TrayHandle } from "./tray";

let mainWindow: BrowserWindow | null = null;
let tray: TrayHandle | null = null;
let trayRefreshQueued = false;
/** Mirrors the close-to-tray pref here because close events fire synchronously. */
let closeToTrayEnabled = false;
/** Set during graceful quit so the close handler stops swallowing the event. */
let isQuitting = false;

export function getMainWindow(): BrowserWindow | null {
  return mainWindow;
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
  mainWindow?.webContents.send(IPC.nav, route);
}

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
  reduceTransparency?: boolean;
  /** Platform can draw vibrancy/tabbed material; boot script mirrors this for CSS gating. */
  shellBackdropCapable?: boolean;
  /** True when native backdrop is active so the boot script can clear the page fill. */
  shellBackdrop?: boolean;
}

function supportsShellBackdrop(): boolean {
  return process.platform === "darwin" || process.platform === "win32";
}

/** macOS vibrancy / Windows tabbed material behind the chrome frame; stage stays opaque in CSS. */
export function syncShellBackdrop(reduceTransparency: boolean): void {
  const win = mainWindow;
  if (!win || win.isDestroyed()) return;
  if (!supportsShellBackdrop()) return;

  const enabled = !reduceTransparency;
  win.setBackgroundColor("#00000000");

  if (process.platform === "darwin") {
    win.setVibrancy(enabled ? "sidebar" : null);
    return;
  }

  if (process.platform === "win32") {
    win.setBackgroundMaterial(enabled ? "tabbed" : "none");
  }
}

async function resolveShellHint(): Promise<ShellHint> {
  const resolved = await resolveTheme();
  if (!resolved) return {};
  const { mode, ...vars } = resolved;
  const prefs = await getPrefs().catch(() => null);
  const reduceTransparency = prefs?.preferences.reduceTransparency === true;
  return {
    theme: mode,
    ...vars,
    pointerCursors: prefs?.preferences.pointerCursors === true,
    reduceTransparency,
    shellBackdropCapable: supportsShellBackdrop(),
    shellBackdrop: supportsShellBackdrop() && !reduceTransparency,
  };
}

export async function createWindow(): Promise<BrowserWindow> {
  const isMac = process.platform === "darwin";

  /** Resolve before the window exists so the first paint is themed. */
  const shellHint = await resolveShellHint();
  const prefs = await getPrefs().catch(() => null);
  const restored =
    prefs?.window.restorePosition && prefs.window.bounds
      ? prefs.window.bounds
      : null;

  const win = new BrowserWindow({
    width: restored?.width ?? 1280,
    height: restored?.height ?? 800,
    x: restored?.x,
    y: restored?.y,
    show: false,
    autoHideMenuBar: true,
    titleBarStyle: isMac ? "hiddenInset" : "default",
    trafficLightPosition: isMac ? { x: 16, y: 13 } : undefined,
    ...(shellHint.shellBackdropCapable ? { backgroundColor: "#00000000" } : {}),
    ...(isMac && shellHint.shellBackdrop
      ? {
          vibrancy: "sidebar" as const,
          visualEffectState: "active" as const,
        }
      : {}),
    ...(process.platform === "win32" && shellHint.shellBackdrop
      ? { backgroundMaterial: "tabbed" as const }
      : {}),
    webPreferences: {
      preload: join(__dirname, "../preload/index.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      backgroundThrottling: true,
      webviewTag: true,
      additionalArguments: [`--pond-shell=${JSON.stringify(shellHint)}`],
    },
  });

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
      const b = win.getBounds();
      void setPrefs({ window: { bounds: b } }).catch((err) =>
        log.warn("[pond] persist window bounds failed", err),
      );
    }, 400);
  };
  win.on("resize", saveBounds);
  win.on("move", saveBounds);

  /** Close-to-tray: hide the window instead of quitting; the tray menu still has Quit. */
  win.on("close", (event) => {
    if (isQuitting) return;
    if (!closeToTrayEnabled) return;
    if (!tray) return;
    if (win.isDestroyed()) return;
    if (mainWindow !== win) return;
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
    await win.loadFile(join(__dirname, "../renderer/index.html"));
  }

  mainWindow = win;
  return win;
}

async function ensureMainWindow(): Promise<BrowserWindow> {
  if (!mainWindow || mainWindow.isDestroyed()) {
    return createWindow();
  }
  return mainWindow;
}

export async function openLibraryWindow(): Promise<void> {
  const win = await ensureMainWindow();
  if (win.isMinimized()) win.restore();
  win.show();
  win.focus();
}

/** macOS `activate`: re-shows or recreates the window when the dock icon is clicked. */
export async function handleActivate(): Promise<void> {
  if (process.platform === "darwin") app.dock?.show();
  if (BrowserWindow.getAllWindows().length === 0) {
    await createWindow();
  } else {
    mainWindow?.show();
  }
}

export function focusedOrMain(): BrowserWindow | null {
  const target = mainWindow ?? BrowserWindow.getFocusedWindow();
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
      onOpenSettings: async () => {
        await openLibraryWindow();
        navigateMain("/settings");
      },
      onOpenSave: async (id) => {
        await openLibraryWindow();
        navigateMain(`/save/${encodeURIComponent(id)}`);
      },
    });
  } catch (err) {
    log.error(
      "[pond] failed to create tray; menu-bar icon will be unavailable",
      err,
    );
  }
}
