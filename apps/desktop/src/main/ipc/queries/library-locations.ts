import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { cp, mkdir, readdir, rm } from "node:fs/promises";
import { basename, dirname, join, resolve } from "node:path";
import { app, BrowserWindow, dialog } from "electron";
import log from "electron-log/main.js";
import { LIBRARY_SCHEMA_VERSION } from "../../../shared/constants";
import { relocateLibrary } from "../../core/library-ops";
import { invalidatePrefs } from "../../core/prefs";
import { reconcileLibrary } from "../../core/scan";
import { migrateLegacySyncPrefs } from "../../core/sync";
import { flushTagsDump, hydrateTagsFromBundle } from "../../core/tags-bundle";
import { closeDb } from "../../db";
import { rotateBundleBackups } from "../../lib/library-config";
import {
  checkPointerSafety,
  readLibraryPointer,
  writeLibraryPointer,
} from "../../lib/library-pointer";
import {
  invalidatePaths,
  libraryRoot as libraryRootDir,
  resolvePaths,
} from "../../paths";
import type { QueryHandlerMap } from "../helpers";

export const libraryLocationQueries: QueryHandlerMap = {
  /** Creates a fresh .pond bundle at `parentDir/name.pond`, writes the pointer, and resolves paths. */
  async "library.createAt"(params) {
    const name = String(params.name ?? "").trim() || "My Pond";
    const parentDir = String(params.path ?? "").trim();
    if (!parentDir) return { ok: false as const, reason: "no_path" as const };

    const bundlePath = ensurePondSuffix(join(parentDir, name));
    const safety = checkPointerSafety(bundlePath);
    if (!safety.ok) return { ok: false as const, reason: safety.reason };

    mkdirSync(join(bundlePath, "items"), { recursive: true });
    mkdirSync(join(bundlePath, "trash"), { recursive: true });

    const metadataFile = join(bundlePath, "metadata.json");
    if (!existsSync(metadataFile)) {
      const bytes = crypto.getRandomValues(new Uint8Array(16));
      const id = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join(
        "",
      );
      writeFileSync(
        metadataFile,
        JSON.stringify(
          {
            id,
            name,
            createdAt: Date.now(),
            schemaVersion: LIBRARY_SCHEMA_VERSION,
            appVersion: process.env.npm_package_version ?? "0.1.0",
          },
          null,
          2,
        ),
      );
    }

    writeLibraryPointer(bundlePath);
    invalidatePaths();
    resolvePaths(bundlePath);

    log.info("[pond library-ops] created new pond at", bundlePath);
    return { ok: true as const, path: bundlePath };
  },

  /** Opens a native folder picker for choosing where to store the pond. */
  async "library.pickFolder"() {
    const win = BrowserWindow.getFocusedWindow() ?? undefined;
    const dialogOpts = {
      title: "Choose where to save your pond",
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

  /** Picks an existing `.pond` bundle to open; pair with `library.switchTo`. */
  async "library.pickExisting"() {
    const win = BrowserWindow.getFocusedWindow() ?? undefined;
    const dialogOpts = {
      title: "Open an existing pond",
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

  /** Opens an existing library (no copy): write pointer, relaunch. */
  async "library.switchTo"(params) {
    const dest = String(params.path ?? "").trim();
    if (!dest) return { ok: false as const, reason: "no_path" as const };

    const destNorm = dest.replace(/\/+$/, "");
    const pointerNorm = readLibraryPointer()?.replace(/\/+$/, "") ?? "";
    const cachedNorm = libraryRootDir().replace(/\/+$/, "");

    /** A prior switch can update the pointer on disk while the main process still holds the old library in its path cache; reconcile before deciding this is a no-op. */
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
  },

  /** Backs "Move Library"; prompts for a destination then copies the library there. */
  async "library.move"(params) {
    const explicitDest =
      typeof params.path === "string" ? params.path.trim() : "";
    let dest = explicitDest;
    if (!dest) {
      const win = BrowserWindow.getFocusedWindow() ?? undefined;
      const dialogOpts = {
        title: "Move library",
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
    try {
      const result = await relocateLibrary(ensurePondSuffix(dest), "copy");
      return { ok: true as const, path: result.path };
    } catch (err) {
      return {
        ok: false as const,
        reason: err instanceof Error ? err.message : "move_failed",
      };
    }
  },

  /** Copies the active `.pond` bundle to a user-chosen path without switching libraries. */
  async "library.backupTo"() {
    const src = libraryRootDir().replace(/\/+$/, "");
    if (!src || !existsSync(src)) {
      return { ok: false as const, reason: "no_library" as const };
    }

    const win = BrowserWindow.getFocusedWindow() ?? undefined;
    const stamp = new Date().toISOString().slice(0, 10);
    const base = basename(src).replace(/\.pond$/i, "") || "Pond";
    const dialogOpts = {
      title: "Backup library",
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

/** Normalizes to exactly one `.pond` suffix. */
function ensurePondSuffix(path: string): string {
  const trimmed = path.replace(/\/+$/, "");
  return trimmed.endsWith(".pond") ? trimmed : `${trimmed}.pond`;
}

/** Defers relaunch so the IPC response lands first; dev soft-repoints in place because app.exit would kill the renderer dev server. */
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
  /** Prod covers this at relaunch; the dev soft re-point never restarts, so fold the target library's legacy sync prefs into accounts here. */
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
