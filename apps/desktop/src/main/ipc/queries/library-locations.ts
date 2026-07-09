import { join } from "node:path";
import { app, BrowserWindow, dialog } from "electron";
import log from "electron-log/main.js";
import {
  previewRelocate,
  type RelocateMode,
  relocateLibrary,
} from "../../core/library-ops";
import { reconcileLibrary } from "../../core/scan";
import { closeDb } from "../../db";
import { rememberLibrary } from "../../lib/library-recents";
import { readLibraryPointer } from "../../lib/library-pointer";
import { invalidatePaths, libraryRoot as libraryRootDir } from "../../paths";
import type { QueryHandlerMap } from "../helpers";

export const libraryLocationQueries: QueryHandlerMap = {
  // New-library picker; returns a `<parent>/<name>.pond` path for relocate to create.
  async "library.pickFolder"() {
    const win = BrowserWindow.getFocusedWindow() ?? undefined;
    const dialogOpts = {
      title: "Create a new pond",
      nameFieldLabel: "Pond Name:",
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

  // Pick a parent folder only (name comes from the app), then compose `<dir>/<name>.pond`.
  async "library.pickNewLocation"(params) {
    const raw = typeof params.name === "string" ? params.name.trim() : "";
    const name = sanitizePondName(raw) || "My Pond";
    const win = BrowserWindow.getFocusedWindow() ?? undefined;
    const dialogOpts = {
      title: "Choose where to keep this pond",
      buttonLabel: "Choose",
      defaultPath: join(app.getPath("home"), "Pond"),
      properties: ["openDirectory" as const, "createDirectory" as const],
    };
    const result = win
      ? await dialog.showOpenDialog(win, dialogOpts)
      : await dialog.showOpenDialog(dialogOpts);
    const dir = result.canceled ? undefined : result.filePaths[0];
    if (!dir) return { ok: false as const, reason: "cancelled" as const };
    return { ok: true as const, path: ensurePondSuffix(join(dir, name)) };
  },

  // Adopt an existing `.pond` bundle; previewRelocate suggests "adopt" so nothing is copied.
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

  // Switch to an existing library (no copy): write pointer, relaunch.
  async "library.switchTo"(params) {
    const dest = String(params.path ?? "").trim();
    if (!dest) return { ok: false as const, reason: "no_path" as const };

    const destNorm = dest.replace(/\/+$/, "");
    const pointerNorm = readLibraryPointer()?.replace(/\/+$/, "") ?? "";
    const cachedNorm = libraryRootDir().replace(/\/+$/, "");

    // A prior switch can update the pointer on disk while the main process
    // still holds the old library in its path cache (e.g. dev soft-reload
    // missed). Reconcile before deciding this is a no-op.
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

  // Create an empty library via the save dialog, then relaunch into it.
  async "library.create"() {
    const win = BrowserWindow.getFocusedWindow() ?? undefined;
    const dialogOpts = {
      title: "Create a new pond",
      nameFieldLabel: "Pond Name:",
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

  // Backs "Move Library…"; prompts for a destination then copies the library there.
  async "library.move"(params) {
    const explicitDest =
      typeof params.path === "string" ? params.path.trim() : "";
    let dest = explicitDest;
    if (!dest) {
      const win = BrowserWindow.getFocusedWindow() ?? undefined;
      const dialogOpts = {
        title: "Create a new pond",
        nameFieldLabel: "Pond Name:",
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
};

// Normalize to exactly one `.pond` suffix.
function ensurePondSuffix(path: string): string {
  const trimmed = path.replace(/\/+$/, "");
  return trimmed.endsWith(".pond") ? trimmed : `${trimmed}.pond`;
}

// Strip filename-illegal chars and any `.pond` suffix from a typed pond name.
function sanitizePondName(name: string): string {
  return name
    .replace(/\.pond$/i, "")
    .replace(/[/\\:*?"<>|]/g, "")
    .trim();
}

// Defer relaunch so the IPC response lands first. Prod relaunches the process;
// dev soft-repoints in place because app.exit would kill the renderer dev server.
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
  // Drop the old index handle and path cache so getDb() opens the new pond's index.
  closeDb();
  invalidatePaths();
  try {
    await reconcileLibrary();
  } catch (err) {
    log.warn("[pond library-ops] dev re-point reconcile failed", err);
  }
  for (const win of BrowserWindow.getAllWindows()) {
    if (!win.isDestroyed()) win.webContents.reload();
  }
}
