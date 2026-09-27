import { writeFile } from "node:fs/promises";
import { app, BrowserWindow, dialog, session, shell } from "electron";
import log from "electron-log/main.js";
import { z } from "zod";
import type { QueryResult } from "../../../shared/query-contracts";
import {
  readLibraryIdentity,
  updateLibraryIdentity,
} from "../../core/library-identity";
import {
  purgeLibrarySubdir,
  verifyLibraryIntegrity,
} from "../../core/library-ops";
import { getPrefs, invalidatePrefs, setPrefs } from "../../core/prefs";
import { reconcileLibrary } from "../../core/scan";
import { closeDb } from "../../db";
import { libraryRoot } from "../../paths";
import { runtimeControls } from "../../runtime";
import { type QueryHandlerMap, query } from "./params";

export const libraryMaintenanceQueries = {
  async "library.info"() {
    const path = libraryRoot();
    return { path, ...readLibraryIdentity(path) };
  },

  "library.identity.update": query(
    z.object({
      name: z.string().optional(),
      icon: z.string().nullable().optional(),
      accent: z.string().nullable().optional(),
    }),
    (params) => {
      try {
        return {
          ok: true as const,
          ...updateLibraryIdentity(libraryRoot(), params),
        };
      } catch (error) {
        return {
          ok: false as const,
          reason:
            error instanceof Error
              ? error.message
              : "Could not customize the library.",
        };
      }
    },
  ),

  async "library.rescan"() {
    return await reconcileLibrary();
  },

  async "library.openInFinder"() {
    const err = await shell.openPath(libraryRoot());
    if (err) return { ok: false as const, reason: err };
    return { ok: true as const };
  },

  async "library.exportDebugReport"() {
    const picked = await dialog.showSaveDialog({
      title: "Export Debug Report",
      defaultPath: `Pond Debug Report ${new Date().toISOString().slice(0, 10)}.zip`,
      filters: [{ name: "ZIP Archive", extensions: ["zip"] }],
    });
    if (picked.canceled || !picked.filePath)
      return { ok: false as const, canceled: true as const };
    const { createDebugReport } = await import("../../core/debug-report");
    await writeFile(picked.filePath, await createDebugReport());
    return { ok: true as const, path: picked.filePath };
  },

  async "library.verifyIntegrity"() {
    try {
      const result = await verifyLibraryIntegrity();
      return { ok: true as const, ...result };
    } catch (err) {
      log.warn("[pond ipc] verifyIntegrity failed", err);
      return {
        ok: false as const,
        reason: err instanceof Error ? err.message : "internal_error",
      };
    }
  },

  async "reset.preferences"() {
    const { DEFAULT_PREFS } = await import("@pond/schema/db");
    await setPrefs(DEFAULT_PREFS);
    return { ok: true as const };
  },

  async "reset.clearVideoCache"() {
    const removed = await purgeLibrarySubdir("_video_cache");
    return { ok: true as const, removed };
  },

  async "reset.clearThumbnails"() {
    const removed = await purgeLibrarySubdir("_thumbs");
    return { ok: true as const, removed };
  },

  async "reset.factory"() {
    const dbPath = (await import("../../paths")).resolvePaths().indexDb;
    closeDb();
    try {
      const { rm } = await import("node:fs/promises");
      await rm(dbPath, { force: true });
    } catch (err) {
      log.warn("[pond reset] db removal failed", err);
    }
    return { ok: true as const };
  },

  async "storage.snapshot"(): Promise<QueryResult<"storage.snapshot">> {
    const { getStorageSnapshot } = await import("../../core/storage-stats");
    return await getStorageSnapshot();
  },

  async "storage.applyGuardPrefs"() {
    const { applyStorageWatcherPrefs } = await import(
      "../../core/storage-watcher"
    );
    await applyStorageWatcherPrefs();
    return { ok: true as const };
  },

  async "storage.guardState"(): Promise<QueryResult<"storage.guardState">> {
    const { getStorageGuardState } = await import("../../core/storage-watcher");
    return getStorageGuardState();
  },

  async "api.restart"() {
    try {
      const result = await runtimeControls.restartHttpServer();
      return { ok: true as const, ...result };
    } catch (err) {
      return {
        ok: false as const,
        reason: err instanceof Error ? err.message : "internal_error",
      };
    }
  },

  async "updates.applyPrefs"() {
    try {
      const { applyUpdaterPrefs } = await import("../../updater");
      await applyUpdaterPrefs();
      return { ok: true as const };
    } catch (err) {
      return {
        ok: false as const,
        reason: err instanceof Error ? err.message : "internal_error",
      };
    }
  },

  async "updates.checkNow"() {
    const { checkForUpdatesNow } = await import("../../updater");
    return await checkForUpdatesNow();
  },

  async "quickCapture.applyPrefs"() {
    try {
      await runtimeControls.applyPrefsAtRuntime();
      return { ok: true as const };
    } catch (err) {
      log.warn("[pond ipc] applyPrefsAtRuntime failed", err);
      return {
        ok: false as const,
        reason: err instanceof Error ? err.message : "internal_error",
      };
    }
  },

  async "window.applyPrefs"() {
    try {
      await runtimeControls.applyWindowPrefsAtRuntime();
      return { ok: true as const };
    } catch (err) {
      log.warn("[pond ipc] applyWindowPrefsAtRuntime failed", err);
      return {
        ok: false as const,
        reason: err instanceof Error ? err.message : "internal_error",
      };
    }
  },

  async "system.applyPrefs"() {
    invalidatePrefs();
    const prefs = (await getPrefs()).system;
    await session.defaultSession.setProxy(
      prefs.proxyMode === "manual" && prefs.proxyUrl
        ? { mode: "fixed_servers", proxyRules: prefs.proxyUrl }
        : { mode: prefs.proxyMode === "direct" ? "direct" : "system" },
    );
    if (process.platform === "darwin") {
      for (const window of BrowserWindow.getAllWindows()) {
        window.setVibrancy(prefs.vibrancy ? "sidebar" : null);
      }
      if (prefs.dockVisibility === "always") await app.dock?.show();
    }
    return { ok: true as const, restartRequired: true };
  },
} satisfies QueryHandlerMap;
