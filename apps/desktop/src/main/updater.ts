import { app, dialog } from "electron";
import log from "electron-log/main.js";
import type { OkResult, ReasonFailure } from "../shared/query-contracts-shared";
import { getPrefs } from "./core/prefs";

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
  });

  autoUpdater.on("update-not-available", () => {
    log.info("[pond updater] no update");
  });

  autoUpdater.on("error", (err) => {
    log.warn("[pond updater] error", err);
  });

  autoUpdater.on("update-downloaded", async (info) => {
    log.info("[pond updater] downloaded", info.version);
    const res = await dialog.showMessageBox({
      type: "info",
      buttons: ["Restart & Install", "Later"],
      defaultId: 0,
      cancelId: 1,
      title: "Pond Update Ready",
      message: `Pond ${info.version} has been downloaded.`,
      detail: "Restart to apply the update.",
    });
    if (res.response === 0) {
      autoUpdater.quitAndInstall();
    }
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
