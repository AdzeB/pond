import { existsSync, mkdirSync } from "node:fs";
import type { Server as NetServer } from "node:net";
import { join, resolve as resolvePath } from "node:path";
import { app, globalShortcut, ipcMain } from "electron";
import log from "electron-log/main.js";
import { DEFAULT_APP_ICON } from "../shared/app-icons";
import {
  DEFAULT_INGEST_PORT,
  IPC,
  type RecentMenuEntry,
} from "../shared/constants";
import { backfillEnrichmentSidecars } from "./core/enrichment-sidecar";
import { ensureDefaultLibrary } from "./core/ensure-default-library";
import { registerSyncActionListener } from "./core/executor";
import { syncLibraryRootMetadata } from "./core/library-ops";
import { startMediaWarmer, stopMediaWarmer } from "./core/media-warm/service";
import { flushGovernor } from "./core/pipeline/rate-governor";
import { startReconciler } from "./core/pipeline/reconciler";
import { getPrefs, invalidatePrefs } from "./core/prefs";
import { startArchiveBackfill } from "./core/refresh/archive-backfill";
import { startMissingVideoBackfill } from "./core/refresh/missing-video-backfill";
import { startPosterBackfill } from "./core/refresh/poster-backfill";
import { disposeHiddenWindow } from "./core/refresh/scrape-window";
import { backfillSourceIcons } from "./core/refresh/source-icon-backfill";
import { startThreadsCardBackfill } from "./core/refresh/threads-card-backfill";
import { startThreadsLandingOgTrash } from "./core/refresh/threads-landing-og-trash";
import { disposeRenderCardWindow } from "./core/render-card";
import { reconcileLibrary } from "./core/scan";
import {
  startStorageWatcher,
  stopStorageWatcher,
} from "./core/storage-watcher";
import {
  migrateLegacySyncPrefs,
  recoverInterruptedSyncs,
  type SyncStatusUpdate,
  subscribeToSyncStatus,
} from "./core/sync";
import { flushTagsDump, hydrateTagsFromBundle } from "./core/tags-bundle";
import {
  registerSyncCron,
  registerTrashCron,
  registerYtDlpUpdateCron,
} from "./crons";
import { getDb } from "./db";
import { handleDeepLink } from "./deep-link";
import { type RunningServer, startHttpServer } from "./http/server";
import { registerIpc } from "./ipc";
import { ensureIngestToken } from "./keychain";
import { broadcast } from "./lib/broadcast";
import { rotateBundleBackups } from "./lib/library-config";
import { installAppMenu, setMenuRecents } from "./menu";
import { writeNativeHostManifests } from "./native/manifests";
import { startNativeServer, stopNativeServer } from "./native/server";
import { libraryRoot, resolvePaths } from "./paths";
import { registerProtocol, registerScheme } from "./protocol";
import { configureSessionDefaults } from "./session-config";
import { setTrayVisible } from "./tray";
import { registerAutoUpdater } from "./updater";
import {
  beginQuit,
  createWindow,
  focusedOrMain,
  getMainWindow,
  handleActivate,
  hasTray,
  initTray,
  openLibraryWindow,
  queueTrayRefresh,
  setCloseToTray,
  summonMainWindow,
} from "./window";

/** Force app.name before any menu/dock work; dev falls back to "Electron" otherwise. */
app.setName("Pond");

if (process.env.POND_SANDBOX) {
  const sandbox = resolvePath(process.env.POND_SANDBOX);
  /** setPath does not create directories, and Chromium expects sessionData to exist. */
  for (const [name, dir] of [
    ["userData", join(sandbox, "app-data")],
    ["sessionData", join(sandbox, "chromium")],
    ["logs", join(sandbox, "logs")],
    ["home", join(sandbox, "home")],
  ] as const) {
    mkdirSync(dir, { recursive: true });
    app.setPath(name, dir);
  }
}
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
let nativeServer: NetServer | null = null;

const broadcastSyncStatus = (status: SyncStatusUpdate): void =>
  broadcast(IPC.syncStatus, status);

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

app.on("open-url", (event, url) => {
  event.preventDefault();
  handleDeepLink(url, getMainWindow());
});

app.on("second-instance", (_event, argv) => {
  const url = argv.find((a) => a.startsWith("pond://"));
  if (url) handleDeepLink(url, getMainWindow());
  const win = getMainWindow();
  if (win && !win.isDestroyed()) {
    if (win.isMinimized()) win.restore();
    win.show();
    win.focus();
  }
});

app.whenReady().then(async () => {
  if (process.platform === "darwin" && !app.isPackaged) {
    const { applyAppIcon } = await import("./core/app-icon");
    await applyAppIcon(DEFAULT_APP_ICON);
  }

  ensureDefaultLibrary();
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

  ipcMain.on(IPC.menuRecents, (_event, entries: RecentMenuEntry[]) => {
    setMenuRecents(Array.isArray(entries) ? entries : []);
  });

  const loginItem = app.getLoginItemSettings();
  const wantsLaunchHidden = await getPrefs()
    .then((p) => p.window.launchHidden === true)
    .catch(() => false);
  setCloseToTray(
    await getPrefs()
      .then((p) => p.window.closeToTray === true)
      .catch(() => false),
  );
  const launchedHidden =
    wantsLaunchHidden ||
    loginItem.wasOpenedAsHidden === true ||
    loginItem.wasOpenedAtLogin === true;
  if (!launchedHidden) {
    await createWindow();
  }

  app.on("activate", () => void handleActivate());

  void postLaunchInit().catch((err) =>
    log.error("[pond] post-launch init failed", err),
  );
});

async function postLaunchInit(): Promise<void> {
  registerSummonHotkey();
  registerAutoUpdater();

  try {
    await syncLibraryRootMetadata();
    if (existsSync(libraryRoot())) {
      snapshotBundleJsons();
    }
  } catch (err) {
    log.warn("[pond] recording active library failed", err);
  }

  try {
    await hydrateTagsFromBundle();
  } catch (err) {
    log.warn("[pond] tags.json hydrate failed", err);
  }

  void reconcileLibrary()
    .catch((err) => log.warn("[pond] scan failed", err))
    .finally(() => startMediaWarmer())
    .then(() => startArchiveBackfill())
    .catch((err) => log.warn("[pond] archive backfill failed", err))
    .then(() => startMissingVideoBackfill())
    .catch((err) => log.warn("[pond] missing video backfill failed", err))
    .then(() => startPosterBackfill())
    .catch((err) => log.warn("[pond] poster backfill failed", err))
    .then(() => startThreadsCardBackfill())
    .catch((err) => log.warn("[pond] native card backfill failed", err))
    .then(() => startThreadsLandingOgTrash())
    .catch((err) => log.warn("[pond] threads landing-og trash failed", err))
    .then(() => backfillSourceIcons())
    .catch((err) => log.warn("[pond] source icon backfill failed", err));
  void backfillEnrichmentSidecars().catch((err) =>
    log.warn("[pond] enrichment sidecar backfill failed", err),
  );
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

  try {
    nativeServer = await startNativeServer();
    writeNativeHostManifests();
  } catch (err) {
    log.error("[pond] native host failed to start", err);
  }

  try {
    await migrateLegacySyncPrefs();
  } catch (err) {
    log.warn("[pond] legacy sync-prefs migration failed", err);
  }
  void recoverInterruptedSyncs().catch((err) =>
    log.warn("[pond] interrupted-sync recovery failed", err),
  );
  registerTrashCron();
  registerYtDlpUpdateCron();
  registerSyncCron();
  void startStorageWatcher().catch((err) =>
    log.warn("[pond] storage watcher failed to start", err),
  );

  await initTray();
  registerSyncActionListener(() => queueTrayRefresh());

  void applyPrefsAtRuntime().catch((err) =>
    log.warn("[pond] applyPrefsAtRuntime failed", err),
  );

  subscribeToSyncStatus(broadcastSyncStatus);
}

function snapshotBundleJsons(): void {
  try {
    const paths = resolvePaths();
    rotateBundleBackups(paths.backupDir, [
      paths.libraryMetadata,
      paths.settingsFile,
      paths.tagsFile,
    ]);
  } catch (err) {
    log.warn("[pond] bundle backup snapshot failed", err);
  }
}

function registerSummonHotkey() {
  const isMac = process.platform === "darwin";
  const summonAccel = isMac ? "Command+Shift+L" : "Control+Shift+L";
  const ok = globalShortcut.register(
    summonAccel,
    () => void summonMainWindow(),
  );
  if (!ok) log.warn(`[pond] summon hotkey ${summonAccel} not registered`);
}

export async function applyPrefsAtRuntime() {
  invalidatePrefs();
  const prefs = await getPrefs();
  await setTrayVisible(prefs.quickCapture.menuBarIcon);
  /** Dev binaries can't register a login item; macOS rejects it. */
  if (app.isPackaged) {
    app.setLoginItemSettings({
      openAtLogin: prefs.quickCapture.launchAtLogin,
      openAsHidden: true,
    });
  }
  setCloseToTray(prefs.window.closeToTray === true);
  const { applyAppIcon } = await import("./core/app-icon");
  await applyAppIcon(prefs.window.appIcon);
}

export async function applyWindowPrefsAtRuntime() {
  invalidatePrefs();
  const prefs = await getPrefs();
  setCloseToTray(prefs.window.closeToTray === true);
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
  if (hasTray()) return;
  app.quit();
});

app.on("before-quit", async () => {
  beginQuit();
  stopMediaWarmer();
  globalShortcut.unregisterAll();
  try {
    await flushTagsDump();
  } catch (err) {
    log.warn("[pond] tags.json flush failed", err);
  }
  try {
    stopStorageWatcher();
  } catch (err) {
    log.warn("[pond] storage watcher stop failed", err);
  }
  try {
    flushGovernor();
  } catch (err) {
    log.warn("[pond] governor flush failed", err);
  }
  try {
    disposeHiddenWindow();
  } catch (err) {
    log.warn("[pond] hidden window dispose failed", err);
  }
  try {
    disposeRenderCardWindow();
  } catch (err) {
    log.warn("[pond] render-card window dispose failed", err);
  }
  try {
    await stopNativeServer(nativeServer);
    nativeServer = null;
  } catch (err) {
    log.warn("[pond] native host close failed", err);
  }
  try {
    await httpServer?.close();
  } catch (err) {
    log.warn("[pond] http server close failed", err);
  }
});
