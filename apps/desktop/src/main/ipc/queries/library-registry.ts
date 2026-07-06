import { existsSync } from "node:fs";
import { BrowserWindow, shell } from "electron";
import log from "electron-log/main.js";
import {
  purgeLibrarySubdir,
  verifyLibraryIntegrity,
} from "../../core/library-ops";
import { reconcileLibrary } from "../../core/scan";
import {
  effectiveName,
  forgetLibrary,
  readKnownLibraries,
  rememberLibrary,
  setLibraryAvatar,
  setLibraryDetails,
  setLibraryOrder,
} from "../../lib/library-recents";
import { libraryRoot as libraryRootDir, materializeLibrary } from "../../paths";
import type { QueryHandlerMap } from "../helpers";

export const libraryRegistryQueries: QueryHandlerMap = {
  async "library.rescan"() {
    return await reconcileLibrary();
  },

  // Create the default library bundle on demand and add it to the switcher.
  async "library.ensureDefault"() {
    const path = materializeLibrary();
    rememberLibrary(path);
    return { ok: true as const, path };
  },

  // Reveal a library in Finder; only tracked paths are honored.
  async "library.openInFinder"(params) {
    const requested = typeof params.path === "string" ? params.path.trim() : "";
    let target = libraryRootDir();
    if (requested) {
      const known = readKnownLibraries().some(
        (l) => l.path.replace(/\/+$/, "") === requested.replace(/\/+$/, ""),
      );
      if (known && existsSync(requested)) target = requested;
    }
    const err = await shell.openPath(target);
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

  // Known libraries, most-recently-opened first, with the active path flagged.
  async "library.listKnown"() {
    const active = libraryRootDir().replace(/\/+$/, "");
    rememberLibrary(active);
    const libraries = readKnownLibraries().map((lib) => ({
      ...lib,
      name: effectiveName(lib),
      active: lib.path.replace(/\/+$/, "") === active,
      exists: existsSync(lib.path),
    }));
    return { active, libraries };
  },

  // Update a library's display name, emoji avatar, and accent color together; tracked paths only.
  async "library.setDetails"(params) {
    const requested =
      typeof params.path === "string" && params.path.trim()
        ? params.path.trim()
        : libraryRootDir();
    const norm = requested.replace(/\/+$/, "");
    const known = readKnownLibraries().some(
      (l) => l.path.replace(/\/+$/, "") === norm,
    );
    if (!known) return { ok: false as const, reason: "unknown" as const };
    setLibraryDetails(requested, {
      name: typeof params.name === "string" ? params.name : undefined,
      avatar:
        params.avatar === null
          ? null
          : typeof params.avatar === "string"
            ? params.avatar
            : undefined,
      color:
        params.color === null
          ? null
          : typeof params.color === "string"
            ? params.color
            : undefined,
    });
    return { ok: true as const };
  },

  // Set a library's emoji avatar; empty clears to initials, tracked paths only.
  async "library.setAvatar"(params) {
    const requested =
      typeof params.path === "string" && params.path.trim()
        ? params.path.trim()
        : libraryRootDir();
    const norm = requested.replace(/\/+$/, "");
    const known = readKnownLibraries().some(
      (l) => l.path.replace(/\/+$/, "") === norm,
    );
    if (!known) return { ok: false as const, reason: "unknown" as const };
    const avatar = typeof params.avatar === "string" ? params.avatar : null;
    setLibraryAvatar(requested, avatar);
    return { ok: true as const };
  },

  // Remove a library from the switcher; never touches files, active can't be forgotten.
  async "library.forget"(params) {
    const target = String(params.path ?? "").trim();
    if (!target) return { ok: false as const, reason: "no_path" as const };
    if (target.replace(/\/+$/, "") === libraryRootDir().replace(/\/+$/, "")) {
      return { ok: false as const, reason: "active" as const };
    }
    forgetLibrary(target);
    return { ok: true as const };
  },

  // Trash the `.pond` bundle and drop it from the switcher; active can't be deleted.
  async "library.delete"(params) {
    const target = String(params.path ?? "").trim();
    if (!target) return { ok: false as const, reason: "no_path" as const };
    const norm = target.replace(/\/+$/, "");
    if (norm === libraryRootDir().replace(/\/+$/, "")) {
      return { ok: false as const, reason: "active" as const };
    }
    const known = readKnownLibraries().some(
      (l) => l.path.replace(/\/+$/, "") === norm,
    );
    if (!known) return { ok: false as const, reason: "unknown" as const };

    if (existsSync(target)) {
      try {
        await shell.trashItem(target);
      } catch (err) {
        log.warn("[pond library-ops] trash failed", target, err);
        return {
          ok: false as const,
          reason: err instanceof Error ? err.message : "delete_failed",
        };
      }
    }
    forgetLibrary(target);
    return { ok: true as const };
  },

  // Persist the drag-reordered library list from the switcher.
  async "library.reorder"(params) {
    const paths = Array.isArray(params.paths)
      ? params.paths.filter((p): p is string => typeof p === "string")
      : [];
    if (paths.length === 0) {
      return { ok: false as const, reason: "no_paths" as const };
    }
    setLibraryOrder(paths);
    return { ok: true as const };
  },

  // Drop derived caches (thumbnails, video) and reload windows to regenerate them.
  async "library.emptyCacheAndReload"() {
    let removed = 0;
    for (const dir of ["_thumbs", "_video_cache"] as const) {
      try {
        removed += await purgeLibrarySubdir(dir);
      } catch (err) {
        log.warn("[pond library-ops] cache purge failed", dir, err);
      }
    }
    setTimeout(() => {
      for (const win of BrowserWindow.getAllWindows()) {
        if (!win.isDestroyed()) win.webContents.reload();
      }
    }, 50);
    return { ok: true as const, removed };
  },
};
