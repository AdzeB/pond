import { existsSync } from "node:fs";
import { readdir } from "node:fs/promises";
import { basename, dirname, join, resolve } from "node:path";
import { app, BrowserWindow, dialog } from "electron";
import log from "electron-log/main.js";
import { z } from "zod";
import { startAutoImport, stopAutoImport } from "../../core/auto-import";
import { createPondBundle } from "../../core/ensure-default-library";
import { resumeMutations, suspendMutations } from "../../core/executor";
import {
  createLibraryBackup,
  restoreLibraryBackup,
  verifyLibraryBackup,
} from "../../core/library-backup";
import { relocateLibrary } from "../../core/library-ops";
import {
  resumeLibraryTransfers,
  stopLibraryTransfers,
} from "../../core/library-transfers";
import { downloadActivity } from "../../core/pipeline/download-activity";
import {
  pauseAndDrainReconciler,
  setReconcilerPaused,
} from "../../core/pipeline/reconciler-client";
import { flushPortableMetadata } from "../../core/portable-metadata";
import { invalidatePrefs, setPrefs } from "../../core/prefs";
import { listRecentLibraries } from "../../core/recent-libraries";
import { reconcileLibrary } from "../../core/scan";
import { migrateLegacySyncPrefs } from "../../core/sync";
import { flushTagsDump, hydrateTagsFromBundle } from "../../core/tags-bundle";
import { runTransferJob } from "../../core/transfer-jobs";
import { mergeLibraryFrom } from "../../core/transfer-operations";
import { clearUndoHistory } from "../../core/undo";
import { closeDb } from "../../db";
import { rotateBundleBackups } from "../../lib/library-config";
import { readLibraryPointer } from "../../lib/library-pointer";
import {
  invalidatePaths,
  libraryRoot as libraryRootDir,
  resolvePaths,
} from "../../paths";
import { type QueryHandlerMap, query, StringParam } from "./params";

const PathParams = z.object({ path: StringParam });

const locationQueries = {
  "library.mergeFrom": query(
    z.object({ source: z.string().optional() }),
    async (params) => {
      let source = params.source?.trim();
      if (!source) {
        const picked = await dialog.showOpenDialog({
          title: "Merge Library",
          buttonLabel: "Merge",
          properties: ["openDirectory", "openFile"],
        });
        source = picked.filePaths[0];
        if (picked.canceled || !source) return { ok: false, error: "canceled" };
      }
      try {
        return {
          ok: true,
          ...(await runTransferJob(
            {
              kind: "merge_library",
              origin: libraryRootDir(),
              destination: libraryRootDir(),
              source,
            },
            () => mergeLibraryFrom(source),
          )),
        };
      } catch (error) {
        return {
          ok: false,
          error:
            error instanceof Error ? error.message : "Could not merge library.",
        };
      }
    },
  ),
  async "library.recent"() {
    return listRecentLibraries(
      join(app.getPath("userData"), "recent-libraries.json"),
      libraryRootDir(),
    );
  },
  "library.createAt": query(
    z.object({ path: StringParam, name: StringParam }),
    async (params) => {
      try {
        await suspendLibraryWork();
        await flushTagsDump();
        const result = await createPondBundle(params.path, params.name);
        if (!result.ok) {
          await resumeLibraryWork();
        } else {
          await relaunchSoon();
        }
        return result;
      } catch (error) {
        await resumeLibraryWork();
        throw error;
      }
    },
  ),

  async "library.pickFolder"() {
    const win = BrowserWindow.getFocusedWindow() ?? undefined;
    const dialogOpts = {
      title: "Choose Where to Save Your Pond",
      buttonLabel: "Select",
      defaultPath: join(app.getPath("home"), "Pond"),
      properties: ["openDirectory" as const, "createDirectory" as const],
    };
    const result = win
      ? await dialog.showOpenDialog(win, dialogOpts)
      : await dialog.showOpenDialog(dialogOpts);
    if (result.canceled || result.filePaths.length === 0) {
      return { ok: false as const, reason: "cancelled" as const };
    }
    return { ok: true as const, path: result.filePaths[0] };
  },

  async "library.pickExisting"() {
    const win = BrowserWindow.getFocusedWindow() ?? undefined;
    const dialogOpts = {
      title: "Open an Existing Pond",
      buttonLabel: "Open",
      properties: ["openFile" as const, "openDirectory" as const],
    };
    const result = win
      ? await dialog.showOpenDialog(win, dialogOpts)
      : await dialog.showOpenDialog(dialogOpts);
    if (result.canceled || result.filePaths.length === 0) {
      return { ok: false as const, reason: "cancelled" as const };
    }
    const dest = result.filePaths[0];
    if (!dest) return { ok: false as const, reason: "cancelled" as const };
    return { ok: true as const, path: dest };
  },

  "library.switchTo": query(PathParams, async (params) => {
    const dest = params.path.trim();
    if (!dest) return { ok: false as const, reason: "no_path" as const };

    const destNorm = dest.replace(/\/+$/, "");
    const pointerNorm = readLibraryPointer()?.replace(/\/+$/, "") ?? "";
    const cachedNorm = libraryRootDir().replace(/\/+$/, "");

    if (
      destNorm === cachedNorm &&
      (!pointerNorm || pointerNorm === cachedNorm)
    ) {
      return { ok: true as const, path: dest, mode: "adopt" as const };
    }
    try {
      await suspendLibraryWork();
      await flushTagsDump();
      if ((await verifyLibraryBackup(dest)).verifiedManifest)
        throw new Error("Use Restore Backup to open a copy of this snapshot.");
      const result = await relocateLibrary(dest, "adopt");
      await relaunchSoon();
      return { ok: true as const, ...result };
    } catch (err) {
      await resumeLibraryWork();
      return {
        ok: false as const,
        reason: err instanceof Error ? err.message : "switch_failed",
      };
    }
  }),

  "library.move": query(PathParams, async (params) => {
    const src = libraryRootDir().replace(/\/+$/, "");
    if (!src || !existsSync(src)) {
      return { ok: false as const, reason: "no_library" as const };
    }

    let dest = params.path.trim();
    if (!dest) {
      const win = BrowserWindow.getFocusedWindow() ?? undefined;
      const dialogOpts = {
        title: "Move Library",
        nameFieldLabel: "Pond Name:",
        buttonLabel: "Move",
        defaultPath: join(app.getPath("home"), "Pond", "My Pond.pond"),
        properties: ["createDirectory" as const],
      };
      const result = win
        ? await dialog.showSaveDialog(win, dialogOpts)
        : await dialog.showSaveDialog(dialogOpts);
      if (result.canceled || !result.filePath) {
        return { ok: false as const, reason: "cancelled" as const };
      }
      dest = result.filePath;
    }

    const destResolved = resolve(ensurePondSuffix(dest)).replace(/\/+$/, "");
    const srcResolved = resolve(src);

    if (srcResolved === destResolved) {
      return { ok: false as const, reason: "same_path" as const };
    }
    if (
      destResolved.startsWith(`${srcResolved}/`) ||
      srcResolved.startsWith(`${destResolved}/`)
    ) {
      return { ok: false as const, reason: "nested_path" as const };
    }

    try {
      if (existsSync(destResolved)) {
        const entries = await readdir(destResolved);
        if (entries.length > 0) {
          return { ok: false as const, reason: "destination_exists" as const };
        }
      }

      await suspendLibraryWork();
      await flushTagsDump();
      await flushPortableMetadata();
      await restoreLibraryBackup({
        source: srcResolved,
        destination: destResolved,
      });
      const result = await relocateLibrary(destResolved, "adopt");
      await relaunchSoon();
      return { ok: true as const, path: result.path };
    } catch (err) {
      await resumeLibraryWork();
      return {
        ok: false as const,
        reason: err instanceof Error ? err.message : "move_failed",
      };
    }
  }),

  "library.backupTo": query(
    z.object({ path: z.string().optional() }),
    async (params) => {
      const src = libraryRootDir().replace(/\/+$/, "");
      if (!src || !existsSync(src)) {
        return { ok: false as const, reason: "no_library" as const };
      }

      const win = BrowserWindow.getFocusedWindow() ?? undefined;
      const stamp = new Date().toISOString().slice(0, 10);
      const base = basename(src).replace(/\.pond$/i, "") || "Pond";
      const dialogOpts = {
        title: "Backup Library",
        nameFieldLabel: "Backup Name:",
        buttonLabel: "Backup",
        defaultPath: join(dirname(src), `${base} Backup ${stamp}.pond`),
        properties: ["createDirectory" as const],
      };
      const picked = params.path?.trim()
        ? { canceled: false, filePath: params.path.trim() }
        : win
          ? await dialog.showSaveDialog(win, dialogOpts)
          : await dialog.showSaveDialog(dialogOpts);
      if (picked.canceled || !picked.filePath) {
        return { ok: false as const, reason: "cancelled" as const };
      }

      const dest = ensurePondSuffix(picked.filePath).replace(/\/+$/, "");
      const srcResolved = resolve(src);
      const destResolved = resolve(dest);

      if (srcResolved === destResolved) {
        return { ok: false as const, reason: "same_path" as const };
      }
      if (
        destResolved.startsWith(`${srcResolved}/`) ||
        srcResolved.startsWith(`${destResolved}/`)
      ) {
        return { ok: false as const, reason: "nested_path" as const };
      }

      try {
        await suspendLibraryWork();
        await flushTagsDump();
        await flushPortableMetadata();
        const { copied } = await createLibraryBackup({
          source: srcResolved,
          destination: destResolved,
        });

        await setPrefs({
          storage: {
            lastBackup: {
              path: destResolved,
              libraryRoot: srcResolved,
              completedAt: new Date().toISOString(),
            },
          },
        }).catch((error) => log.warn("Could not record backup history", error));
        return { ok: true as const, path: destResolved, copied };
      } catch (err) {
        return {
          ok: false as const,
          reason: err instanceof Error ? err.message : "backup_failed",
        };
      } finally {
        await resumeLibraryWork();
      }
    },
  ),

  "library.restoreBackup": query(
    z.object({
      source: z.string().optional(),
      destination: z.string().optional(),
    }),
    async (params) => {
      const win = BrowserWindow.getFocusedWindow() ?? undefined;
      const options = {
        title: "Choose a Pond Backup",
        buttonLabel: "Choose Backup",
        properties: ["openFile" as const, "openDirectory" as const],
      };
      const picked = params.source?.trim()
        ? { canceled: false, filePaths: [params.source.trim()] }
        : win
          ? await dialog.showOpenDialog(win, options)
          : await dialog.showOpenDialog(options);
      const source = picked.filePaths[0];
      if (picked.canceled || !source)
        return { ok: false as const, reason: "cancelled" };
      try {
        await verifyLibraryBackup(source);
        const destinationOptions = {
          title: "Restore Backup",
          buttonLabel: "Restore",
          defaultPath: join(
            dirname(source),
            `${basename(source).replace(/\.pond$/i, "")} Restored.pond`,
          ),
          properties: ["createDirectory" as const],
        };
        const destination = params.destination?.trim()
          ? { canceled: false, filePath: params.destination.trim() }
          : win
            ? await dialog.showSaveDialog(win, destinationOptions)
            : await dialog.showSaveDialog(destinationOptions);
        if (destination.canceled || !destination.filePath)
          return { ok: false as const, reason: "cancelled" };
        await suspendLibraryWork();
        await flushTagsDump();
        const restored = await restoreLibraryBackup({
          source,
          destination: ensurePondSuffix(destination.filePath),
        });
        await relocateLibrary(restored.path, "adopt");
        await relaunchSoon();
        return { ok: true as const, ...restored };
      } catch (error) {
        await resumeLibraryWork();
        return {
          ok: false as const,
          reason: error instanceof Error ? error.message : "restore_failed",
        };
      }
    },
  ),
} satisfies QueryHandlerMap;

let reconcilerWasPaused: boolean | null = null;
async function suspendLibraryWork(): Promise<void> {
  await stopAutoImport();
  await stopLibraryTransfers();
  if (reconcilerWasPaused === null)
    reconcilerWasPaused = await pauseAndDrainReconciler();
  await suspendMutations();
}

async function resumeLibraryWork(): Promise<void> {
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
async function serializeLocationChange<T>(
  operation: () => Promise<T>,
): Promise<T> {
  const next = locationChange.then(() => {
    if (relaunchPending)
      throw new Error("The library is reopening. Try again when it opens.");
    return operation();
  });
  locationChange = next.then(
    () => {},
    () => {},
  );
  return next;
}
export const libraryLocationQueries = {
  ...locationQueries,
  "library.createAt": (
    ...args: Parameters<(typeof locationQueries)["library.createAt"]>
  ) =>
    serializeLocationChange(() => locationQueries["library.createAt"](...args)),
  "library.switchTo": (
    ...args: Parameters<(typeof locationQueries)["library.switchTo"]>
  ) =>
    serializeLocationChange(() => locationQueries["library.switchTo"](...args)),
  "library.move": (
    ...args: Parameters<(typeof locationQueries)["library.move"]>
  ) => serializeLocationChange(() => locationQueries["library.move"](...args)),
  "library.backupTo": (
    ...args: Parameters<(typeof locationQueries)["library.backupTo"]>
  ) =>
    serializeLocationChange(() => locationQueries["library.backupTo"](...args)),
  "library.restoreBackup": (
    ...args: Parameters<(typeof locationQueries)["library.restoreBackup"]>
  ) =>
    serializeLocationChange(() =>
      locationQueries["library.restoreBackup"](...args),
    ),
} satisfies QueryHandlerMap;

export function waitForLibraryLocationChanges(): Promise<void> {
  return locationChange;
}

function ensurePondSuffix(path: string): string {
  const trimmed = path.replace(/\/+$/, "");
  return trimmed.endsWith(".pond") ? trimmed : `${trimmed}.pond`;
}

async function relaunchSoon(): Promise<void> {
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
