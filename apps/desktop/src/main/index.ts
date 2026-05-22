import { join, resolve as resolvePath } from "node:path";
import {
  app,
  BrowserWindow,
  globalShortcut,
  Menu,
  powerMonitor,
  session,
  shell,
} from "electron";
import log from "electron-log/main.js";
import {
  DEFAULT_INGEST_PORT,
  IPC,
  type MenuActionId,
} from "../shared/constants";
import { startBackupCron } from "./core/backups";
import { registerSyncActionListener } from "./core/executor";
import { emptyTrashOlderThan } from "./core/library-ops";
import { startSaveCompleteNotifier } from "./core/notifications";
import {
  type ProcessingBackfillStatus,
  subscribeProcessingBackfillStatus,
} from "./core/pipeline/backfill-failed";
import { enqueueCaptureTweetForExisting } from "./core/pipeline/enqueue";
import { startReconciler } from "./core/pipeline/reconciler";
import { getPrefs, invalidatePrefs } from "./core/prefs";
import {
  type RefreshBackfillStatus,
  subscribeRefreshBackfillStatus,
} from "./core/refresh/backfill";
import { disposeHiddenWindow } from "./core/refresh/scrape-window";
import { reconcileLibrary } from "./core/scan";
import {
  startStorageWatcher,
  stopStorageWatcher,
} from "./core/storage-watcher";
import { initSuggestions } from "./core/suggestions";
import {
  getGlobalSync,
  patchGlobalSync,
  type SyncStatusUpdate,
  subscribeToSyncStatus,
  syncAllSources,
} from "./core/sync";
import { isOnWifi } from "./core/sync/network-type";
import { computeNextDueAt, isInQuietHours } from "./core/sync/schedule";
import { getDb } from "./db";
import { type RunningServer, startHttpServer } from "./http/server";
import { registerIpc } from "./ipc";
import { ensureIngestToken } from "./keychain";
import { broadcast } from "./lib/broadcast";
import { schedule } from "./lib/scheduler";
import { libraryRoot, resolvePaths } from "./paths";
import { registerProtocol, registerScheme } from "./protocol";
import { ensureTray, setTrayVisible, type TrayHandle } from "./tray";
import { registerAutoUpdater } from "./updater";

// macOS reads the app menu's title and the About / Hide / Quit labels
// from `app.name`, which in dev falls back to the Electron binary's
// own `name` ("Electron") instead of our `productName`. Force it
// before any menu, dock, or about-panel work.
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
const broadcastRefreshBackfillStatus = (status: RefreshBackfillStatus): void =>
  broadcast(IPC.refreshBackfillStatus, status);
const broadcastProcessingProgress = (status: ProcessingBackfillStatus): void =>
  broadcast(IPC.processingProgress, status);

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
      route = `/search?q=${encodeURIComponent(q)}`;
    } else if (parsed.hostname === "capture") {
      const target = parsed.searchParams.get("url") ?? "";
      route = `/quick-capture?url=${encodeURIComponent(target)}`;
    } else if (parsed.hostname === "pair") {
      const token = parsed.searchParams.get("token") ?? "";
      route = `/settings/api${token ? `?token=${encodeURIComponent(token)}` : ""}`;
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
      "script-src 'self'",
      "connect-src 'self' http://127.0.0.1:* pond: https:",
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
  pointerCursors?: boolean;
}

async function resolveShellHint(): Promise<ShellHint> {
  try {
    const prefs = await getPrefs();
    const themePref = prefs.preferences.theme;
    return {
      theme: themePref === "system" ? undefined : themePref,
      pointerCursors: prefs.preferences.pointerCursors === true,
    };
  } catch {
    return {};
  }
}

async function createWindow(): Promise<BrowserWindow> {
  const isMac = process.platform === "darwin";

  // Resolve the user's stored shell tokens before the BrowserWindow exists
  // so the preload can hand them to the inline boot script and the very
  // first paint is correctly themed. Falls back to system preference if
  // the DB read fails or this is a first launch.
  const shellHint = await resolveShellHint();

  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    show: false,
    autoHideMenuBar: true,
    titleBarStyle: isMac ? "hiddenInset" : "default",
    trafficLightPosition: isMac ? { x: 16, y: 24 } : undefined,
    webPreferences: {
      preload: join(__dirname, "../preload/index.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      additionalArguments: [`--pond-shell=${JSON.stringify(shellHint)}`],
    },
  });

  win.on("ready-to-show", () => win.show());

  win.webContents.on("did-finish-load", () => {
    if (win.isDestroyed()) return;
    if (pendingDeepLink) {
      const route = pendingDeepLink;
      pendingDeepLink = null;
      win.webContents.send(IPC.nav, route);
    }
  });

  win.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url);
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
  installAppMenu();

  const loginItem = app.getLoginItemSettings();
  const launchedHidden =
    loginItem.wasOpenedAsHidden ?? loginItem.wasOpenedAtLogin ?? false;
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

  void reconcileLibrary().catch((err) => log.warn("[pond] scan failed", err));
  startReconciler();

  void enqueueCaptureTweetForExisting().catch((err) =>
    log.warn("[pond] capture_tweet backfill failed", err),
  );

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
  registerSyncCron();
  startBackupCron();
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
    });
  } catch (err) {
    log.error(
      "[pond] failed to create tray; menu-bar icon will be unavailable",
      err,
    );
  }
  registerSyncActionListener(() => queueTrayRefresh());

  startSaveCompleteNotifier({
    focusMainWindow: async () => {
      await openLibraryWindow();
      return mainWindow;
    },
  });

  void applyPrefsAtRuntime().catch((err) =>
    log.warn("[pond] applyPrefsAtRuntime failed", err),
  );

  subscribeToSyncStatus(broadcastSyncStatus);
  subscribeRefreshBackfillStatus(broadcastRefreshBackfillStatus);
  subscribeProcessingBackfillStatus(broadcastProcessingProgress);

  initSuggestions();
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

async function broadcastSyncSchedule(): Promise<void> {
  try {
    const prefs = await getGlobalSync();
    const due = computeNextDueAt(prefs, new Date());
    broadcast(IPC.syncSchedulePush, {
      lastFireAt: prefs.lastFireAt,
      nextDueAt: due ? due.toISOString() : null,
    });
  } catch (err) {
    log.warn("[pond sync-cron] schedule broadcast failed", err);
  }
}

function registerSyncCron() {
  schedule({
    name: "sync",
    every: 60 * 1000,
    initialDelay: 60_000,
    fn: async () => {
      const prefs = await getGlobalSync();
      if (!prefs.enabled) return;
      const now = new Date();
      const due = computeNextDueAt(prefs, now);
      if (!due) return;
      if (due.getTime() > now.getTime()) return;

      if (prefs.quietHours && isInQuietHours(now, prefs.quietHours)) return;
      if (prefs.onlyOnAcPower && powerMonitor.isOnBatteryPower()) return;
      if (prefs.onlyOnWifi) {
        const wifi = await isOnWifi();
        if (wifi === false) return;
      }

      await patchGlobalSync({ lastFireAt: now.toISOString() });
      void broadcastSyncSchedule();
      void syncAllSources({ trigger: "cron" });
    },
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

function navTo(path: string) {
  return () => {
    const target = focusedOrMain();
    target?.webContents.send(IPC.nav, path);
  };
}

function sendMenuAction(id: MenuActionId) {
  return () => {
    const target = focusedOrMain();
    target?.webContents.send(IPC.menuAction, id);
  };
}

function openExternalUrl(url: string) {
  return () => {
    void shell.openExternal(url);
  };
}

function installAppMenu() {
  const isMac = process.platform === "darwin";

  const preferencesItem: Electron.MenuItemConstructorOptions = {
    label: "Preferences…",
    accelerator: isMac ? "Command+," : "Control+,",
    click: navTo("/settings"),
  };

  const template: Electron.MenuItemConstructorOptions[] = [
    ...(isMac
      ? [
          {
            label: app.name,
            submenu: [
              { role: "about" as const, label: `About ${app.name}` },
              { type: "separator" as const },
              {
                label: "Check for Updates…",
                click: navTo("/settings/updates"),
              },
              { type: "separator" as const },
              preferencesItem,
              { type: "separator" as const },
              { role: "services" as const },
              { type: "separator" as const },
              { role: "hide" as const },
              { role: "hideOthers" as const },
              { role: "unhide" as const },
              { type: "separator" as const },
              { role: "quit" as const },
            ],
          } satisfies Electron.MenuItemConstructorOptions,
        ]
      : []),
    {
      label: "File",
      submenu: [
        {
          label: "New Save…",
          accelerator: "CommandOrControl+N",
          click: navTo("/?capture=1"),
        },
        { type: "separator" },
        {
          label: "Sync All Sources",
          accelerator: "CommandOrControl+Shift+R",
          click: () => void syncAllSources({ trigger: "manual" }),
        },
        {
          label: "Refresh All Metadata…",
          click: sendMenuAction("refresh.all"),
        },
        { type: "separator" },
        {
          label: "Reveal Library in Finder",
          accelerator: "CommandOrControl+Shift+O",
          click: () => void shell.openPath(libraryRoot()),
        },
        {
          label: "Create Backup Snapshot",
          click: async () => {
            try {
              const { snapshotNow } = await import("./core/backups");
              await snapshotNow();
            } catch (err) {
              log.warn("[pond menu] snapshotNow failed", err);
            }
          },
        },
        { type: "separator" },
        isMac ? { role: "close" } : { role: "quit" },
      ],
    },
    {
      label: "Edit",
      submenu: [
        {
          label: "Undo",
          accelerator: "CommandOrControl+Z",
          click: () => {
            const win = BrowserWindow.getFocusedWindow();
            if (!win || win.isDestroyed()) return;
            win.webContents.undo();
            win.webContents.send(IPC.editUndoRequested);
          },
        },
        {
          label: "Redo",
          accelerator: isMac ? "Command+Shift+Z" : "Control+Y",
          click: () => {
            const win = BrowserWindow.getFocusedWindow();
            if (!win || win.isDestroyed()) return;
            win.webContents.redo();
            win.webContents.send(IPC.editRedoRequested);
          },
        },
        { type: "separator" },
        { role: "cut" },
        { role: "copy" },
        { role: "paste" },
        { role: "selectAll" },
        ...(!isMac ? [{ type: "separator" as const }, preferencesItem] : []),
      ],
    },
    {
      label: "Find",
      submenu: [
        {
          label: "Command Palette…",
          accelerator: "CommandOrControl+K",
          click: sendMenuAction("palette.open"),
        },
      ],
    },
    {
      label: "Library",
      submenu: [
        {
          label: "All Saves",
          accelerator: "Control+CommandOrControl+1",
          click: navTo("/"),
        },
        {
          label: "Recents",
          accelerator: "Control+CommandOrControl+2",
          click: navTo("/recents"),
        },
        {
          label: "Random",
          accelerator: "Control+CommandOrControl+3",
          click: navTo("/random"),
        },
        {
          label: "Untagged",
          accelerator: "Control+CommandOrControl+4",
          click: navTo("/untagged"),
        },
        {
          label: "Trash",
          accelerator: "Control+CommandOrControl+5",
          click: navTo("/trash"),
        },
        { type: "separator" },
        { label: "Activity", click: navTo("/activity") },
        { type: "separator" },
        {
          label: "Rescan Library",
          click: () =>
            void reconcileLibrary().catch((err) =>
              log.warn("[pond menu] rescan failed", err),
            ),
        },
        {
          label: "Verify Integrity",
          click: async () => {
            try {
              const { verifyLibraryIntegrity } = await import(
                "./core/library-ops"
              );
              await verifyLibraryIntegrity();
            } catch (err) {
              log.warn("[pond menu] verify failed", err);
            }
          },
        },
      ],
    },
    {
      label: "View",
      submenu: [
        {
          label: "Toggle Sidebar",
          accelerator: isMac ? "Alt+Command+1" : "Alt+Control+1",
          click: sendMenuAction("view.sidebar.toggle"),
        },
        {
          label: "Toggle Inspector",
          accelerator: isMac ? "Alt+Command+2" : "Alt+Control+2",
          click: sendMenuAction("view.inspector.toggle"),
        },
        { type: "separator" },
        {
          label: "Theme",
          submenu: [
            { label: "Light", click: sendMenuAction("theme.light") },
            { label: "Dark", click: sendMenuAction("theme.dark") },
            { label: "Match System", click: sendMenuAction("theme.system") },
          ],
        },
        { type: "separator" },
        { role: "resetZoom" },
        { role: "zoomIn" },
        { role: "zoomOut" },
        { type: "separator" },
        { role: "togglefullscreen" },
        ...(!app.isPackaged
          ? ([
              { type: "separator" },
              { role: "reload" },
              { role: "forceReload" },
              { role: "toggleDevTools" },
            ] satisfies Electron.MenuItemConstructorOptions[])
          : []),
      ],
    },
    {
      label: "Window",
      submenu: [
        { role: "minimize" },
        { role: "zoom" },
        ...(isMac
          ? ([
              { type: "separator" },
              { role: "front" },
              { type: "separator" },
              {
                label: "Library",
                accelerator: "CommandOrControl+Shift+P",
                click: () => void openLibraryWindow(),
              },
            ] satisfies Electron.MenuItemConstructorOptions[])
          : ([
              { role: "close" },
            ] satisfies Electron.MenuItemConstructorOptions[])),
      ],
    },
    {
      label: "Help",
      role: "help",
      submenu: [
        {
          label: "Pond on GitHub",
          click: openExternalUrl("https://github.com/raphaelsalaja/pond"),
        },
        {
          label: "Report an Issue…",
          click: openExternalUrl(
            "https://github.com/raphaelsalaja/pond/issues/new",
          ),
        },
        { type: "separator" },
        {
          label: "Show Logs in Finder",
          click: () => void shell.openPath(app.getPath("logs")),
        },
      ],
    },
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
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
  app.setLoginItemSettings({
    openAtLogin: prefs.quickCapture.launchAtLogin,
    openAsHidden: true,
  });
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
