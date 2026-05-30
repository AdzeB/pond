import { existsSync } from "node:fs";
import { join } from "node:path";
import { app, BrowserWindow, dialog, shell } from "electron";
import log from "electron-log/main.js";
import {
  emptyTrashOlderThan,
  previewRelocate,
  purgeLibrarySubdir,
  type RelocateMode,
  relocateLibrary,
  verifyLibraryIntegrity,
} from "../../core/library-ops";
import { setPrefs } from "../../core/prefs";
import { reconcileLibrary } from "../../core/scan";
import {
  forgetLibrary,
  readKnownLibraries,
  rememberLibrary,
} from "../../lib/library-recents";
import { libraryRoot as libraryRootDir } from "../../paths";
import type { QueryHandlerMap } from "../helpers";

export const libraryQueries: QueryHandlerMap = {
  async "library.rescan"() {
    return await reconcileLibrary();
  },

  async "library.openInFinder"() {
    const root = libraryRootDir();
    const err = await shell.openPath(root);
    if (err) return { ok: false as const, reason: err };
    return { ok: true as const };
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

  // Eagle-style "New Library" picker: the user types a name and picks
  // a parent folder, and we hand back a full `<parent>/<name>.pond`
  // path. The library lives inside that single bundle rather than
  // scattering items/, trash/, metadata.json loose into the chosen
  // folder. The renderer passes the path to `library.previewRelocate`
  // and `library.relocate`, which create the bundle. We keep "pick"
  // and "preview" separate so the renderer is free to call preview
  // against a hard-coded path too (used during onboarding tests).
  async "library.pickFolder"() {
    const win = BrowserWindow.getFocusedWindow() ?? undefined;
    const dialogOpts = {
      title: "Create a new Pond library",
      nameFieldLabel: "Library Name:",
      buttonLabel: "Create",
      defaultPath: join(app.getPath("home"), "Pond", "My Pond.pond"),
      properties: ["createDirectory" as const],
    };
    const result = win
      ? await dialog.showSaveDialog(win, dialogOpts)
      : await dialog.showSaveDialog(dialogOpts);
    if (result.canceled || !result.filePath) {
      return { ok: false as const, reason: "cancelled" as const };
    }
    return { ok: true as const, path: ensurePondSuffix(result.filePath) };
  },

  // Adopt an existing library. Lets the user point at a `.pond` bundle
  // that already exists (e.g. one synced from another Mac via iCloud).
  // `previewRelocate` will suggest "adopt" for it so nothing is copied.
  async "library.pickExisting"() {
    const win = BrowserWindow.getFocusedWindow() ?? undefined;
    const dialogOpts = {
      title: "Open an existing Pond library",
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

  async "library.previewRelocate"(params) {
    const candidate = String(params.path ?? "").trim();
    if (!candidate) {
      return { ok: false as const, reason: "no_path" as const };
    }
    try {
      const preview = previewRelocate(candidate);
      return { ok: true as const, preview };
    } catch (err) {
      return {
        ok: false as const,
        reason: err instanceof Error ? err.message : "preview_failed",
      };
    }
  },

  async "library.relocate"(params) {
    const dest = String(params.path ?? "").trim();
    const mode = (params.mode === "adopt" ? "adopt" : "copy") as RelocateMode;
    const restart = params.restart !== false;
    if (!dest) {
      return { ok: false as const, reason: "no_path" as const };
    }
    try {
      const result = await relocateLibrary(dest, mode);
      rememberLibrary(result.path);
      if (restart) relaunchSoon();
      return { ok: true as const, ...result };
    } catch (err) {
      return {
        ok: false as const,
        reason: err instanceof Error ? err.message : "relocate_failed",
      };
    }
  },

  // The switcher's known-library list, most-recently-opened first,
  // with the currently-active path flagged.
  async "library.listKnown"() {
    const active = libraryRootDir().replace(/\/+$/, "");
    rememberLibrary(active);
    const libraries = readKnownLibraries().map((lib) => ({
      ...lib,
      active: lib.path.replace(/\/+$/, "") === active,
      exists: existsSync(lib.path),
    }));
    return { active, libraries };
  },

  // Jump to a library that already exists on disk (no copy): write the
  // pointer, remember it, relaunch into it.
  async "library.switchTo"(params) {
    const dest = String(params.path ?? "").trim();
    if (!dest) return { ok: false as const, reason: "no_path" as const };
    if (dest.replace(/\/+$/, "") === libraryRootDir().replace(/\/+$/, "")) {
      return { ok: true as const, path: dest, mode: "adopt" as const };
    }
    try {
      const result = await relocateLibrary(dest, "adopt");
      rememberLibrary(result.path);
      relaunchSoon();
      return { ok: true as const, ...result };
    } catch (err) {
      return {
        ok: false as const,
        reason: err instanceof Error ? err.message : "switch_failed",
      };
    }
  },

  // Create a brand-new, empty library: name it via the save dialog,
  // point at it, relaunch. The fresh `.pond` bundle is materialized on
  // next boot (items/, trash/, metadata.json) and the index starts empty.
  async "library.create"() {
    const win = BrowserWindow.getFocusedWindow() ?? undefined;
    const dialogOpts = {
      title: "Create a new Pond library",
      nameFieldLabel: "Library Name:",
      buttonLabel: "Create",
      defaultPath: join(app.getPath("home"), "Pond", "My Pond.pond"),
      properties: ["createDirectory" as const],
    };
    const picked = win
      ? await dialog.showSaveDialog(win, dialogOpts)
      : await dialog.showSaveDialog(dialogOpts);
    if (picked.canceled || !picked.filePath) {
      return { ok: false as const, reason: "cancelled" as const };
    }
    const dest = ensurePondSuffix(picked.filePath);
    try {
      const result = await relocateLibrary(dest, "adopt");
      rememberLibrary(result.path);
      relaunchSoon();
      return { ok: true as const, ...result };
    } catch (err) {
      return {
        ok: false as const,
        reason: err instanceof Error ? err.message : "create_failed",
      };
    }
  },

  // Remove a library from the switcher list. Never touches files; the
  // active library can't be forgotten.
  async "library.forget"(params) {
    const target = String(params.path ?? "").trim();
    if (!target) return { ok: false as const, reason: "no_path" as const };
    if (target.replace(/\/+$/, "") === libraryRootDir().replace(/\/+$/, "")) {
      return { ok: false as const, reason: "active" as const };
    }
    forgetLibrary(target);
    return { ok: true as const };
  },

  // Back-compat: old "Move Library…" calls funnel through here. New
  // UI uses pickFolder + previewRelocate + relocate.
  async "library.move"(params) {
    const explicitDest =
      typeof params.path === "string" ? params.path.trim() : "";
    let dest = explicitDest;
    if (!dest) {
      const win = BrowserWindow.getFocusedWindow() ?? undefined;
      const dialogOpts = {
        title: "Create a new Pond library",
        nameFieldLabel: "Library Name:",
        buttonLabel: "Create",
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

  async "trash.emptyOlderThan"(params) {
    const days = Math.max(0, Number(params.days ?? 0));
    const purged = await emptyTrashOlderThan(days);
    return { ok: true as const, purged };
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

// A Pond library is a single `<name>.pond` bundle. The save dialog can
// hand back a path the user typed without the extension, so normalize
// to exactly one `.pond` suffix.
function ensurePondSuffix(path: string): string {
  const trimmed = path.replace(/\/+$/, "");
  return trimmed.endsWith(".pond") ? trimmed : `${trimmed}.pond`;
}

// Defer the relaunch so the IPC response can land before we tear down
// the process. The renderer's `await` resolves with the success
// payload, then the app vanishes and comes back pointing at the new
// library.
function relaunchSoon(): void {
  setTimeout(() => {
    log.info("[pond library-ops] relaunching into new library");
    app.relaunch();
    app.exit(0);
  }, 150);
}
