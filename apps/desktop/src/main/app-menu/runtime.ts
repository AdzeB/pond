import type { Locale } from "@pond/schema";
import { app, BrowserWindow, shell, type WebContents } from "electron";
import log from "electron-log/main.js";
import { IPC, type MenuActionId } from "../../shared/constants";
import {
  createCopyTranslator,
  createTranslator,
} from "../../shared/localization";
import {
  resolveShortcuts,
  type ShortcutId,
  type ShortcutPreferences,
} from "../../shared/shortcuts";
import { reconcileLibrary } from "../core/scan";
import { openSettingsWindow } from "../core/settings-window";
import { menuAccelerator } from "../lib/menu-accelerator";
import { libraryRoot } from "../paths";
import type { AppMenuContext } from "./types";

export interface AppMenuRuntimeDeps {
  focusedOrMain: () => BrowserWindow | null;
  openLibraryWindow: () => void;
  shortcuts: ShortcutPreferences;
  locale: Locale;
}

function withFocusedWebContents(
  run: (contents: WebContents) => void,
): () => void {
  return () => {
    const win = BrowserWindow.getFocusedWindow();
    if (!win || win.isDestroyed()) return;
    run(win.webContents);
  };
}

export function createAppMenuContext(deps: AppMenuRuntimeDeps): AppMenuContext {
  const bindings = resolveShortcuts(deps.shortcuts);
  const accelerator = (id: ShortcutId) => menuAccelerator(bindings[id]);
  const navTo = (path: string) => async () => {
    if (path === "/settings" || path.startsWith("/settings/")) {
      await openSettingsWindow({
        section: path.slice("/settings/".length) || undefined,
      });
      return;
    }
    await deps.openLibraryWindow();
    deps.focusedOrMain()?.webContents.send(IPC.nav, path);
  };
  const sendMenuAction = (id: MenuActionId) => async () => {
    if (
      id === "capture.area" ||
      id === "capture.window" ||
      id === "capture.screen"
    ) {
      const { beginScreenshot } = await import("../core/screenshot-window");
      const mode =
        id === "capture.area"
          ? "area"
          : id === "capture.window"
            ? "window"
            : "screen";
      await beginScreenshot(mode).catch((error) =>
        log.warn("[pond menu] capture failed", error),
      );
      return;
    }
    await deps.openLibraryWindow();
    deps.focusedOrMain()?.webContents.send(IPC.menuAction, id);
  };

  return {
    accelerator,
    appName: app.name,
    edit: {
      copy: withFocusedWebContents((contents) => contents.copy()),
      cut: withFocusedWebContents((contents) => contents.cut()),
      paste: withFocusedWebContents((contents) => contents.paste()),
      redo: withFocusedWebContents((contents) => {
        contents.redo();
        contents.send(IPC.editRedoRequested);
      }),
      selectAll: withFocusedWebContents((contents) => contents.selectAll()),
      undo: withFocusedWebContents((contents) => {
        contents.undo();
        contents.send(IPC.editUndoRequested);
      }),
    },
    isMac: process.platform === "darwin",
    isPackaged: app.isPackaged,
    navTo,
    openExternalUrl: (url: string) => () => {
      void shell.openExternal(url);
    },
    openLibraryWindow: deps.openLibraryWindow,
    openRecent: (id: string) => () => {
      deps.focusedOrMain()?.webContents.send(IPC.menuOpenSave, id);
    },
    rescanLibrary: () => {
      void reconcileLibrary().catch((error) =>
        log.warn("[pond menu] rescan failed", error),
      );
    },
    reloadLibrary: () => {
      deps.focusedOrMain()?.webContents.reload();
    },
    revealLibrary: () => {
      void shell.openPath(libraryRoot());
    },
    sendMenuAction,
    showLogs: () => {
      void shell.openPath(app.getPath("logs"));
    },
    translate: createTranslator(deps.locale),
    translateCopy: createCopyTranslator(deps.locale),
    verifyLibrary: async () => {
      try {
        const { verifyLibraryIntegrity } = await import("../core/library-ops");
        await verifyLibraryIntegrity();
      } catch (error) {
        log.warn("[pond menu] verify failed", error);
      }
    },
  };
}
