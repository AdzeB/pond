import { existsSync } from "node:fs";
import { cp, mkdir, readdir, rm } from "node:fs/promises";
import { basename, dirname, join, resolve } from "node:path";
import { app, BrowserWindow, dialog } from "electron";
import log from "electron-log/main.js";
import { z } from "zod";
import { createPondBundle } from "../../core/ensure-default-library";
import { relocateLibrary } from "../../core/library-ops";
import { invalidatePrefs } from "../../core/prefs";
import { reconcileLibrary } from "../../core/scan";
import { migrateLegacySyncPrefs } from "../../core/sync";
import { flushTagsDump, hydrateTagsFromBundle } from "../../core/tags-bundle";
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

export const libraryLocationQueries: QueryHandlerMap = {
  "library.createAt": query(
    z.object({ path: StringParam, name: StringParam }),
    async (params) => createPondBundle(params.path, params.name),
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

    if (pointerNorm && pointerNorm !== cachedNorm) {
      invalidatePaths();
    }

    const activeNorm = (readLibraryPointer() ?? libraryRootDir()).replace(
      /\/+$/,
      "",
    );
    if (destNorm === activeNorm) {
      if (pointerNorm && pointerNorm !== cachedNorm) relaunchSoon();
      return { ok: true as const, path: dest, mode: "adopt" as const };
    }
    try {
      const result = await relocateLibrary(dest, "adopt");
      relaunchSoon();
      return { ok: true as const, ...result };
    } catch (err) {
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

      const result = await relocateLibrary(destResolved, "copy");
      relaunchSoon();
      return { ok: true as const, path: result.path };
    } catch (err) {
      return {
        ok: false as const,
        reason: err instanceof Error ? err.message : "move_failed",
      };
    }
  }),

  async "library.backupTo"() {
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
    const picked = win
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
      if (existsSync(destResolved)) {
        const entries = await readdir(destResolved);
        if (entries.length > 0) {
          return { ok: false as const, reason: "destination_exists" as const };
        }
      } else {
        await mkdir(destResolved, { recursive: true });
      }

      let copied = 0;
      for (const entry of await readdir(srcResolved)) {
        await cp(join(srcResolved, entry), join(destResolved, entry), {
          recursive: true,
        });
        copied += 1;
      }

      log.info(
        `[pond library-ops] backed up library → ${destResolved} (${copied} top-level entries)`,
      );
      return { ok: true as const, path: destResolved, copied };
    } catch (err) {
      if (existsSync(destResolved)) {
        await rm(destResolved, { recursive: true, force: true }).catch(
          () => {},
        );
      }
      return {
        ok: false as const,
        reason: err instanceof Error ? err.message : "backup_failed",
      };
    }
  },
};

function ensurePondSuffix(path: string): string {
  const trimmed = path.replace(/\/+$/, "");
  return trimmed.endsWith(".pond") ? trimmed : `${trimmed}.pond`;
}

function relaunchSoon(): void {
  if (process.env.ELECTRON_RENDERER_URL) {
    setTimeout(() => {
      void softRepointInDev();
    }, 150);
    return;
  }
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
  closeDb();
  invalidatePaths();
  invalidatePrefs();
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
  for (const win of BrowserWindow.getAllWindows()) {
    if (!win.isDestroyed()) win.webContents.reload();
  }
}
