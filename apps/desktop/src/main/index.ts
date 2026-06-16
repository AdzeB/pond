import { existsSync } from "node:fs";
import { join, resolve as resolvePath } from "node:path";
import {
  app,
  BrowserWindow,
  globalShortcut,
  nativeTheme,
  session,
  shell,
} from "electron";
import log from "electron-log/main.js";
import { DEFAULT_INGEST_PORT, IPC } from "../shared/constants";
import { registerSyncActionListener } from "./core/executor";
import { emptyTrashOlderThan } from "./core/library-ops";
import {
  type BackfillStatusUpdate,
  subscribeToBackfillStatus,
} from "./core/pipeline/enqueue";
import { startReconciler } from "./core/pipeline/reconciler";
import { getPrefs, invalidatePrefs, setPrefs } from "./core/prefs";
import { disposeHiddenWindow } from "./core/refresh/scrape-window";
import { maybeUpdateYtDlp } from "./core/refresh/yt-dlp-updater";
import { reconcileLibrary } from "./core/scan";
import {
  startStorageWatcher,
  stopStorageWatcher,
} from "./core/storage-watcher";
import { type SyncStatusUpdate, subscribeToSyncStatus } from "./core/sync";
import { getDb } from "./db";
import { applyWindowGlass, glassEnabled, isGlassSupported } from "./glass";
import { type RunningServer, startHttpServer } from "./http/server";
import { registerIpc } from "./ipc";
import { ensureIngestToken } from "./keychain";
import { broadcast } from "./lib/broadcast";
import { pruneMissingLibraries, rememberLibrary } from "./lib/library-recents";
import { schedule } from "./lib/scheduler";
import { installAppMenu } from "./menu";
import { libraryRoot, resolvePaths } from "./paths";
import { registerProtocol, registerScheme } from "./protocol";
import { ensureTray, setTrayVisible, type TrayHandle } from "./tray";
import { registerAutoUpdater } from "./updater";

// Force app.name before any menu/dock work; dev falls back to "Electron" otherwise.
app.setName("Pond");
if (process.platform === "darwin") {
  app.setAboutPanelOptions({
    applicationName: "Pond",
    applicationVersion: app.getVersion(),
    copyright: "Copyright © 2026 Raphael Salaja",
  });
}

log.initialize();
log.info("[pond] main starting", {
  version: app.getVersion(),
  platform: process.platform,
});

let httpServer: RunningServer | null = null;
let mainWindow: BrowserWindow | null = null;
let tray: TrayHandle | null = null;
let trayRefreshQueued = false;
// Mirror the close-to-tray toggle here; close events fire synchronously.
let closeToTrayEnabled = false;
// Set during graceful quit so the close handler stops swallowing the event.
let isQuitting = false;

function queueTrayRefresh() {
  if (!tray || trayRefreshQueued) return;
  trayRefreshQueued = true;
  setTimeout(() => {
    trayRefreshQueued = false;
    void tray?.refresh();
  }, 150);
}

const broadcastSyncStatus = (status: SyncStatusUpdate): void =>
  broadcast(IPC.syncStatus, status);

const broadcastBackfillStatus = (status: BackfillStatusUpdate): void =>
  broadcast(IPC.screenshotBackfillStatus, status);

registerScheme();

const gotSingleInstanceLock = app.requestSingleInstanceLock();
if (!gotSingleInstanceLock) {
  app.quit();
}

if (process.defaultApp) {
  if (process.argv.length >= 2) {
    app.setAsDefaultProtocolClient("pond", process.execPath, [
      resolvePath(process.argv[1] ?? ""),
    ]);
  }
} else {
  app.setAsDefaultProtocolClient("pond");
}

let pendingDeepLink: string | null = null;
function handleDeepLink(url: string): void {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "pond:") return;
    let route: string | null = null;
    if (parsed.hostname === "" || parsed.hostname === "library") {
      route = "/";
    } else if (parsed.hostname === "item") {
      const id = parsed.pathname.replace(/^\//, "");
      if (id) route = `/save/${encodeURIComponent(id)}`;
    } else if (parsed.hostname === "search") {
      const q = parsed.searchParams.get("q") ?? "";
      route = `/?q=${encodeURIComponent(q)}`;
    } else if (parsed.hostname === "capture") {
      const target = parsed.searchParams.get("url") ?? "";
      route = `/?capture=1${target ? `&url=${encodeURIComponent(target)}` : ""}`;
    } else if (parsed.hostname === "pair") {
      const token = parsed.searchParams.get("token") ?? "";
      route = `/settings/general${token ? `?token=${encodeURIComponent(token)}` : ""}`;
    } else if (parsed.hostname === "settings") {
      const sub = parsed.pathname.replace(/^\//, "").replace(/\/+$/, "");
      route = sub ? `/settings/${sub}` : "/settings";
    }
    if (!route) {
      log.info("[pond deep-link] ignored", url);
      return;
    }
    log.info("[pond deep-link] route", route);
    const target =
      mainWindow && !mainWindow.isDestroyed()
        ? mainWindow
        : (BrowserWindow.getAllWindows().find((w) => !w.isDestroyed()) ?? null);
    if (!target) {
      pendingDeepLink = route;
      return;
    }
    if (target.isMinimized()) target.restore();
    target.show();
    target.focus();
    target.webContents.send(IPC.nav, route);
  } catch (err) {
    log.warn("[pond deep-link] parse failed", url, err);
  }
}

app.on("open-url", (event, url) => {
  event.preventDefault();
  handleDeepLink(url);
});

app.on("second-instance", (_event, argv) => {
  const url = argv.find((a) => a.startsWith("pond://"));
  if (url) handleDeepLink(url);
  if (mainWindow && !mainWindow.isDestroyed()) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
  }
});

function configureSessionDefaults(): void {
  const denyAll: Parameters<
    Electron.Session["setPermissionRequestHandler"]
  >[0] = (_wc, _permission, callback) => callback(false);
  session.defaultSession.setPermissionRequestHandler(denyAll);
  try {
    session
      .fromPartition("persist:pond-scrapers")
      .setPermissionRequestHandler(denyAll);
  } catch (err) {
    log.warn("[pond] scrapers session permission handler failed", err);
  }

  if (app.isPackaged) {
    const PROD_CSP = [
      "default-src 'self' pond:",
      "img-src 'self' data: blob: pond: https:",
      "media-src 'self' data: blob: pond: https:",
      "style-src 'self' 'unsafe-inline'",
      // onnxruntime-web needs wasm-unsafe-eval and blob: for its wasm module/worker.
      "script-src 'self' 'wasm-unsafe-eval' blob:",
      "worker-src 'self' blob:",
      "connect-src 'self' blob: http://127.0.0.1:* pond: https:",
      "font-src 'self' data:",
      "frame-src https://www.youtube-nocookie.com",
      "object-src 'none'",
      "frame-ancestors 'none'",
      "base-uri 'self'",
    ].join("; ");
    session.defaultSession.webRequest.onHeadersReceived((details, cb) => {
      const headers = { ...(details.responseHeaders ?? {}) };
      for (const key of Object.keys(headers)) {
        if (key.toLowerCase() === "content-security-policy") {
          delete headers[key];
        }
      }
      headers["Content-Security-Policy"] = [PROD_CSP];
      cb({ responseHeaders: headers });
    });
  }
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
  // Native Liquid Glass: `glass` is the current active state (first paint),
  // `glassSupported` lets the renderer react to the toggle without a restart.
  glass?: boolean;
  glassSupported?: boolean;
}

async function resolveShellHint(): Promise<ShellHint> {
  try {
    const { resolveActiveTheme, themeEngineVars } = await import(
      "@pond/schema/db"
    );
    const prefs = await getPrefs();
    const def = resolveActiveTheme(prefs, nativeTheme.shouldUseDarkColors);
    const v = themeEngineVars(def);
    return {
      theme: v.isDark ? "dark" : "light",
      baseL: v.baseL,
      baseC: v.baseC,
      baseH: v.baseH,
      accentL: v.accentL,
      accentC: v.accentC,
      accentH: v.accentH,
      contrast: v.contrast,
      fgDir: v.fgDir,
      pointerCursors: prefs.preferences.pointerCursors === true,
      glass: glassEnabled(prefs),
      glassSupported: isGlassSupported(),
    };
  } catch {
    return {};
  }
}

async function createWindow(): Promise<BrowserWindow> {
  const isMac = process.platform === "darwin";

  // Resolve before the window exists so the first paint is themed.
  const shellHint = await resolveShellHint();
  const prefs = await getPrefs().catch(() => null);
  const restored =
    prefs?.window.restorePosition && prefs.window.bounds
      ? prefs.window.bounds
      : null;

  // A transparent window lets the native glass backing (below the web layer)
  // refract the desktop. Only on macOS when glass is active; the renderer keeps
  // its content opaque otherwise, so the window still looks solid.
  const glassActive = glassEnabled(prefs);

  const win = new BrowserWindow({
    width: restored?.width ?? 1280,
    height: restored?.height ?? 800,
    x: restored?.x,
    y: restored?.y,
    show: false,
    autoHideMenuBar: true,
    titleBarStyle: isMac ? "hiddenInset" : "default",
    trafficLightPosition: isMac ? { x: 16, y: 24 } : undefined,
    transparent: isMac && glassActive,
    backgroundColor: isMac && glassActive ? "#00000000" : undefined,
    webPreferences: {
      preload: join(__dirname, "../preload/index.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      additionalArguments: [`--pond-shell=${JSON.stringify(shellHint)}`],
    },
  });

  win.on("ready-to-show", () => {
    if (glassActive) applyWindowGlass(win, prefs);
    win.show();
  });

  // Persist bounds on resize/move (debounced) so the next launch restores them.
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

  // Close-to-tray: hide the window instead of quitting; tray menu still has Quit.
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
    if (pendingDeepLink) {
      const route = pendingDeepLink;
      pendingDeepLink = null;
      win.webContents.send(IPC.nav, route);
    }
  });

  win.webContents.setWindowOpenHandler(({ url }) => {
    // Only hand http(s) to the OS; other schemes via openExternal are an RCE vector.
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

  return win;
}

async function openLibraryWindow(): Promise<void> {
  if (!mainWindow || mainWindow.isDestroyed()) {
    mainWindow = await createWindow();
  }
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.show();
  mainWindow.focus();
}

app.whenReady().then(async () => {
  const paths = resolvePaths();
  log.info("[pond] paths", paths);

  configureSessionDefaults();

  await ensureIngestToken();
  registerProtocol();

  try {
    await getDb();
  } catch (err) {
    log.error("[pond] db init failed", err);
  }

  registerIpc();
  installAppMenu({
    focusedOrMain,
    openLibraryWindow: () => void openLibraryWindow(),
  });

  const loginItem = app.getLoginItemSettings();
  const wantsLaunchHidden = await getPrefs()
    .then((p) => p.window.launchHidden === true)
    .catch(() => false);
  closeToTrayEnabled = await getPrefs()
    .then((p) => p.window.closeToTray === true)
    .catch(() => false);
  const launchedHidden =
    wantsLaunchHidden ||
    loginItem.wasOpenedAsHidden === true ||
    loginItem.wasOpenedAtLogin === true;
  if (!launchedHidden) {
    mainWindow = await createWindow();
  }

  app.on("activate", async () => {
    if (process.platform === "darwin") app.dock?.show();
    if (BrowserWindow.getAllWindows().length === 0) {
      mainWindow = await createWindow();
    } else {
      mainWindow?.show();
    }
  });

  void postLaunchInit().catch((err) =>
    log.error("[pond] post-launch init failed", err),
  );
});

async function postLaunchInit(): Promise<void> {
  registerSummonHotkey();
  registerAutoUpdater();

  try {
    const active = libraryRoot();
    // Don't list a not-yet-created library; we remember it on first write.
    if (existsSync(active)) rememberLibrary(active);
    pruneMissingLibraries(active);
  } catch (err) {
    log.warn("[pond] recording active library failed", err);
  }

  void reconcileLibrary().catch((err) => log.warn("[pond] scan failed", err));
  startReconciler();

  try {
    const prefs = await getPrefs();
    httpServer = await startHttpServer(
      prefs.api.port || DEFAULT_INGEST_PORT,
      prefs.api.bindAddress,
    );
  } catch (err) {
    log.error("[pond] http server failed to start", err);
  }

  registerTrashCron();
  registerYtDlpUpdateCron();
  void startStorageWatcher().catch((err) =>
    log.warn("[pond] storage watcher failed to start", err),
  );

  try {
    tray = await ensureTray({
      onOpenLibrary: openLibraryWindow,
      onOpenSettings: async () => {
        await openLibraryWindow();
        mainWindow?.webContents.send(IPC.nav, "/settings");
      },
      onOpenSave: async (id) => {
        await openLibraryWindow();
        mainWindow?.webContents.send(
          IPC.nav,
          `/save/${encodeURIComponent(id)}`,
        );
      },
    });
  } catch (err) {
    log.error(
      "[pond] failed to create tray; menu-bar icon will be unavailable",
      err,
    );
  }
  registerSyncActionListener(() => queueTrayRefresh());

  void applyPrefsAtRuntime().catch((err) =>
    log.warn("[pond] applyPrefsAtRuntime failed", err),
  );

  subscribeToSyncStatus(broadcastSyncStatus);
  subscribeToBackfillStatus(broadcastBackfillStatus);
}

function registerTrashCron() {
  schedule({
    name: "trash",
    every: 60 * 60 * 1000,
    initialDelay: 30_000,
    fn: async () => {
      const prefs = await getPrefs();
      const days = prefs.trash.autoEmptyDays;
      if (days === null) return;
      const purged = await emptyTrashOlderThan(days);
      if (purged > 0) {
        log.info(
          `[pond trash-cron] purged ${purged} items older than ${days}d`,
        );
      }
    },
  });
}

function registerYtDlpUpdateCron() {
  schedule({
    name: "yt-dlp-update",
    every: 24 * 60 * 60 * 1000,
    // yt-dlp isn't bundled; check soon after launch, then daily.
    initialDelay: 5_000,
    fn: () => maybeUpdateYtDlp(),
  });
}

function focusedOrMain(): BrowserWindow | null {
  const target = mainWindow ?? BrowserWindow.getFocusedWindow();
  if (!target || target.isDestroyed()) return null;
  if (target.isMinimized()) target.restore();
  target.show();
  target.focus();
  return target;
}

async function summonMainWindow() {
  if (!mainWindow || mainWindow.isDestroyed()) {
    mainWindow = await createWindow();
  }
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.show();
  mainWindow.focus();
}

function registerSummonHotkey() {
  const isMac = process.platform === "darwin";
  const summonAccel = isMac ? "Command+Shift+L" : "Control+Shift+L";
  const ok = globalShortcut.register(summonAccel, summonMainWindow);
  if (!ok) log.warn(`[pond] summon hotkey ${summonAccel} not registered`);
}

export async function applyPrefsAtRuntime() {
  invalidatePrefs();
  const prefs = await getPrefs();
  await setTrayVisible(prefs.quickCapture.menuBarIcon);
  // Toggle the glass backing live. The window's transparency is fixed at
  // creation, so enabling glass for the first time fully takes effect on the
  // next launch; the renderer reacts to `liquidGlass`/`reduceTransparency` via
  // the shell hint's `glassSupported` flag.
  if (mainWindow && !mainWindow.isDestroyed()) {
    applyWindowGlass(mainWindow, prefs);
  }
  // Dev binaries can't register a login item; macOS rejects it.
  if (app.isPackaged) {
    app.setLoginItemSettings({
      openAtLogin: prefs.quickCapture.launchAtLogin,
      openAsHidden: true,
    });
  }
  closeToTrayEnabled = prefs.window.closeToTray === true;
}

export async function applyWindowPrefsAtRuntime() {
  invalidatePrefs();
  const prefs = await getPrefs();
  closeToTrayEnabled = prefs.window.closeToTray === true;
}

export async function restartHttpServer(): Promise<{
  port: number;
  host: string;
}> {
  invalidatePrefs();
  const prefs = await getPrefs();
  if (httpServer) {
    try {
      await httpServer.close();
    } catch (err) {
      log.warn("[pond] http close failed", err);
    }
  }
  httpServer = await startHttpServer(
    prefs.api.port || DEFAULT_INGEST_PORT,
    prefs.api.bindAddress,
  );
  return { port: httpServer.port, host: httpServer.host };
}

app.on("window-all-closed", () => {
  if (process.platform === "darwin") {
    app.dock?.hide();
    return;
  }
  if (tray) return;
  app.quit();
});

app.on("before-quit", async () => {
  isQuitting = true;
  globalShortcut.unregisterAll();
  try {
    stopStorageWatcher();
  } catch (err) {
    log.warn("[pond] storage watcher stop failed", err);
  }
  try {
    disposeHiddenWindow();
  } catch (err) {
    log.warn("[pond] hidden window dispose failed", err);
  }
  try {
    await httpServer?.close();
  } catch (err) {
    log.warn("[pond] http server close failed", err);
  }
});
