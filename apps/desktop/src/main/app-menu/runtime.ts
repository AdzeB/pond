import { app, BrowserWindow, shell, type WebContents } from "electron";
import log from "electron-log/main.js";
import { IPC, type MenuActionId } from "../../shared/constants";
import {
  resolveShortcuts,
  type ShortcutId,
  type ShortcutPreferences,
} from "../../shared/shortcuts";
import { reconcileLibrary } from "../core/scan";
import { menuAccelerator } from "../lib/menu-accelerator";
import { libraryRoot } from "../paths";
import type { AppMenuContext } from "./types";

export interface AppMenuRuntimeDeps {
  focusedOrMain: () => BrowserWindow | null;
  openLibraryWindow: () => void;
  shortcuts: ShortcutPreferences;
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
  const navTo = (path: string) => () => {
    deps.focusedOrMain()?.webContents.send(IPC.nav, path);
  };
  const sendMenuAction = (id: MenuActionId) => () => {
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
    revealLibrary: () => {
      void shell.openPath(libraryRoot());
    },
    sendMenuAction,
    showLogs: () => {
      void shell.openPath(app.getPath("logs"));
    },
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
