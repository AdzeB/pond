import { app, BrowserWindow } from "electron";
import log from "electron-log/main.js";
import { startAutoImport, stopAutoImport } from "../../core/auto-import";
import { resumeMutations, suspendMutations } from "../../core/executor";
import {
  resumeLibraryTransfers,
  stopLibraryTransfers,
} from "../../core/library-transfers";
import { downloadActivity } from "../../core/pipeline/download-activity";
import {
  pauseAndDrainReconciler,
  setReconcilerPaused,
} from "../../core/pipeline/reconciler-client";
import { invalidatePrefs } from "../../core/prefs";
import { reconcileLibrary } from "../../core/scan";
import { migrateLegacySyncPrefs } from "../../core/sync";
import { flushTagsDump, hydrateTagsFromBundle } from "../../core/tags-bundle";
import { clearUndoHistory } from "../../core/undo";
import { closeDb } from "../../db";
import { rotateBundleBackups } from "../../lib/library-config";
import { invalidatePaths, resolvePaths } from "../../paths";

let reconcilerWasPaused: boolean | null = null;

export async function suspendLibraryWork(): Promise<void> {
  await stopAutoImport();
  await stopLibraryTransfers();
  if (reconcilerWasPaused === null) {
    reconcilerWasPaused = await pauseAndDrainReconciler();
  }
  await suspendMutations();
}

export async function resumeLibraryWork(): Promise<void> {
  resumeMutations();
  resumeLibraryTransfers();
  const wasPaused = reconcilerWasPaused;
  reconcilerWasPaused = null;
  if (wasPaused === false) await setReconcilerPaused(false);
  await startAutoImport().catch((error) =>
    log.warn("Could not start auto-import", error),
  );
}

let relaunchPending = false;
let locationChange: Promise<void> = Promise.resolve();

export async function serializeLocationChange<T>(
  operation: () => Promise<T>,
): Promise<T> {
  const next = locationChange.then(() => {
    if (relaunchPending) {
      throw new Error("The library is reopening. Try again when it opens.");
    }
    return operation();
  });
  locationChange = next.then(
    () => {},
    () => {},
  );
  return next;
}

export function waitForLibraryLocationChanges(): Promise<void> {
  return locationChange;
}

export async function relaunchSoon(): Promise<void> {
  if (process.env.ELECTRON_RENDERER_URL) {
    await softRepointInDev();
    return;
  }
  relaunchPending = true;
  setTimeout(() => {
    log.info("[pond library-ops] relaunching into new library");
    app.relaunch();
    app.exit(0);
  }, 150);
}

async function softRepointInDev(): Promise<void> {
  log.info("[pond library-ops] dev re-point into new library (no relaunch)");
  await flushTagsDump().catch((err) =>
    log.warn("[pond library-ops] tags.json flush failed", err),
  );
  downloadActivity.reset();
  closeDb();
  invalidatePaths();
  invalidatePrefs();
  clearUndoHistory();
  resumeMutations();
  try {
    const paths = resolvePaths();
    rotateBundleBackups(paths.backupDir, [
      paths.libraryMetadata,
      paths.settingsFile,
      paths.tagsFile,
    ]);
  } catch (err) {
    log.warn("[pond library-ops] bundle backup rotation failed", err);
  }
  try {
    await hydrateTagsFromBundle();
  } catch (err) {
    log.warn("[pond library-ops] tags.json hydrate failed", err);
  }
  try {
    await migrateLegacySyncPrefs();
  } catch (err) {
    log.warn("[pond library-ops] legacy sync-prefs migration failed", err);
  }
  try {
    await reconcileLibrary();
  } catch (err) {
    log.warn("[pond library-ops] dev re-point reconcile failed", err);
  }
  await resumeLibraryWork();
  for (const win of BrowserWindow.getAllWindows()) {
    if (!win.isDestroyed()) win.webContents.reload();
  }
}
