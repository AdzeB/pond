import log from "electron-log/main.js";
import { purgeLibrarySubdir } from "../../core/library-ops";
import { setPrefs } from "../../core/prefs";
import { closeDb } from "../../db";
import type { QueryHandlerMap } from "../helpers";

export const libraryMaintenanceQueries: QueryHandlerMap = {
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
    // Close the handle first so we delete the file, not an inode still being written.
    closeDb();
    try {
      const { rm } = await import("node:fs/promises");
      await rm(dbPath, { force: true });
    } catch (err) {
      log.warn("[pond reset] db removal failed", err);
    }
    return { ok: true as const };
  },

  async "storage.snapshot"() {
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

  async "storage.guardState"() {
    const { getStorageGuardState } = await import("../../core/storage-watcher");
    return getStorageGuardState();
  },

  async "api.restart"() {
    try {
      const { restartHttpServer } = await import("../../index");
      const result = await restartHttpServer();
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
      const { applyPrefsAtRuntime } = await import("../../index");
      await applyPrefsAtRuntime();
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
      const { applyWindowPrefsAtRuntime } = await import("../../index");
      await applyWindowPrefsAtRuntime();
      return { ok: true as const };
    } catch (err) {
      log.warn("[pond ipc] applyWindowPrefsAtRuntime failed", err);
      return {
        ok: false as const,
        reason: err instanceof Error ? err.message : "internal_error",
      };
    }
  },
};
