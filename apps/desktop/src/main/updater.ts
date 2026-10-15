import { app } from "electron";
import log from "electron-log/main.js";
import { IPC } from "../shared/constants";
import type { OkResult, ReasonFailure } from "../shared/query-contracts-shared";
import type { UpdateNotice } from "../shared/update-notice";
import { getPrefs } from "./core/prefs";
import { broadcast } from "./lib/broadcast";

const SIX_HOURS_MS = 6 * 60 * 60 * 1000;
let wired = false;

async function loadAutoUpdater() {
  const { default: electronUpdaterPkg } = await import("electron-updater");
  return electronUpdaterPkg.autoUpdater;
}

export function registerAutoUpdater(): void {
  if (wired) return;
  if (!app.isPackaged) {
    log.info("[pond updater] skipped (dev build)");
    return;
  }
  wired = true;
  void wireAutoUpdater().catch((error) => {
    wired = false;
    log.warn("[pond updater] setup failed", error);
  });
}

async function wireAutoUpdater(): Promise<void> {
  const autoUpdater = await loadAutoUpdater();
  autoUpdater.logger = log;
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;
  void applyUpdaterPrefs().catch((err) =>
    log.warn("[pond updater] prefs apply failed", err),
  );

  autoUpdater.on("update-available", (info) => {
    log.info("[pond updater] update available", info.version);
    publishUpdateNotice({
      phase: "available",
      version: info.version,
      downloading: autoUpdater.autoDownload,
    });
  });

  autoUpdater.on("update-not-available", () => {
    log.info("[pond updater] no update");
  });

  autoUpdater.on("error", (err) => {
    log.warn("[pond updater] error", err);
  });

  autoUpdater.on("update-downloaded", (info) => {
    log.info("[pond updater] downloaded", info.version);
    publishUpdateNotice({ phase: "downloaded", version: info.version });
  });

  setTimeout(() => {
    void autoUpdater.checkForUpdates().catch((err) => {
      log.warn("[pond updater] startup check failed", err);
    });
  }, 2000);

  setInterval(() => {
    void autoUpdater.checkForUpdates().catch(() => {});
  }, SIX_HOURS_MS);
}

export async function applyUpdaterPrefs(): Promise<void> {
  if (!app.isPackaged) return;
  const autoUpdater = await loadAutoUpdater();
  const prefs = await getPrefs();
  autoUpdater.allowPrerelease = false;
  autoUpdater.autoDownload = prefs.updates.autoInstall;
}

function publishUpdateNotice(notice: UpdateNotice): void {
  broadcast(IPC.updateNotice, notice);
}

export async function downloadAvailableUpdate(): Promise<
  OkResult | ReasonFailure<"dev_build">
> {
  if (!app.isPackaged) return { ok: false, reason: "dev_build" };
  try {
    const autoUpdater = await loadAutoUpdater();
    await autoUpdater.downloadUpdate();
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error:
        err instanceof Error ? err.message : "Couldn't download the update.",
    };
  }
}

export async function installDownloadedUpdate(): Promise<
  OkResult | ReasonFailure<"dev_build">
> {
  if (!app.isPackaged) return { ok: false, reason: "dev_build" };
  const autoUpdater = await loadAutoUpdater();
  autoUpdater.quitAndInstall();
  return { ok: true };
}

export async function checkForUpdatesNow(): Promise<
  OkResult<{ version?: string }> | ReasonFailure<"dev_build">
> {
  if (!app.isPackaged) {
    return { ok: false, reason: "dev_build" };
  }
  try {
    const autoUpdater = await loadAutoUpdater();
    const result = await autoUpdater.checkForUpdates();
    return {
      ok: true,
      version: result?.updateInfo?.version,
    };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Couldn't check for updates.",
    };
  }
}
