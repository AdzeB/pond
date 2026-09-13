import { SOURCES, sourceLabel } from "@pond/schema";
import { app, BrowserWindow, Menu, shell, type WebContents } from "electron";
import log from "electron-log/main.js";
import {
  IPC,
  type MenuActionId,
  type RecentMenuEntry,
} from "../shared/constants";
import {
  resolveShortcuts,
  type ShortcutId,
  type ShortcutPreferences,
} from "../shared/shortcuts";
import { subscribePrefs } from "./core/prefs";
import { reconcileLibrary } from "./core/scan";
import { syncAllSources, syncSource } from "./core/sync";
import {
  FILE_MENU_AUTO_IMPORT_LABELS,
  FILE_MENU_CREATE_LABELS,
  FILE_MENU_DUPLICATES_LABELS,
} from "./file-menu";
import { menuAccelerator } from "./lib/menu-accelerator";
import { disableMenuActionImages } from "./lib/menu-action-images";
import { LIBRARY_MENU_LABELS } from "./library-menu";
import { libraryRoot } from "./paths";

interface AppMenuDeps {
  focusedOrMain: () => BrowserWindow | null;
  openLibraryWindow: () => void;
  shortcuts: ShortcutPreferences;
}

const RECENTS_MENU_CAP = 12;

function withFocusedWebContents(run: (contents: WebContents) => void): void {
  const win = BrowserWindow.getFocusedWindow();
  if (!win || win.isDestroyed()) return;
  run(win.webContents);
}

let activeDeps: AppMenuDeps | null = null;
let recentEntries: RecentMenuEntry[] = [];
let unsubscribePrefs: (() => void) | undefined;

export function setMenuRecents(entries: RecentMenuEntry[]): void {
  recentEntries = entries.slice(0, RECENTS_MENU_CAP);
  if (activeDeps) buildAndSetMenu(activeDeps);
}

export function installAppMenu(deps: AppMenuDeps): void {
  disableMenuActionImages();
  activeDeps = deps;
  unsubscribePrefs?.();
  let shortcutKey = JSON.stringify(deps.shortcuts);
  unsubscribePrefs = subscribePrefs((prefs) => {
    if (!activeDeps) return;
    const nextKey = JSON.stringify(prefs.shortcuts);
    if (nextKey === shortcutKey) return;
    shortcutKey = nextKey;
    activeDeps = { ...activeDeps, shortcuts: prefs.shortcuts };
    buildAndSetMenu(activeDeps);
  });
  buildAndSetMenu(deps);
}

function buildAndSetMenu(deps: AppMenuDeps): void {
  const { focusedOrMain, openLibraryWindow } = deps;
  const isMac = process.platform === "darwin";
  const bindings = resolveShortcuts(deps.shortcuts);
  const accelerator = (id: ShortcutId) => menuAccelerator(bindings[id]);

  const navTo = (path: string) => () => {
    const target = focusedOrMain();
    target?.webContents.send(IPC.nav, path);
  };

  const sendMenuAction = (id: MenuActionId) => () => {
    const target = focusedOrMain();
    target?.webContents.send(IPC.menuAction, id);
  };

  const openExternalUrl = (url: string) => () => {
    void shell.openExternal(url);
  };

  const openRecent = (id: string) => () => {
    focusedOrMain()?.webContents.send(IPC.menuOpenSave, id);
  };

  const recentsItems = (): Electron.MenuItemConstructorOptions[] => {
    if (recentEntries.length === 0) {
      return [{ label: "No Recent Items", enabled: false }];
    }
    return recentEntries.map((entry) => ({
      label: entry.title,
      click: openRecent(entry.id),
    }));
  };

  const sourcesSubmenu = (): Electron.MenuItemConstructorOptions[] => {
    const syncItems: Electron.MenuItemConstructorOptions[] = SOURCES.filter(
      (source) => source !== "local",
    ).map((source) => ({
      label: `Sync ${sourceLabel(source)}`,
      click: () => {
        void syncSource(source, { trigger: "manual" }).catch((err) =>
          log.warn(`[pond menu] sync ${source} failed`, err),
        );
      },
    }));
    return [
      {
        label: "Sync All",
        accelerator: accelerator("sources.sync-all"),
        registerAccelerator: false,
        click: () => void syncAllSources({ trigger: "manual" }),
      },
      ...syncItems,
      { type: "separator" },
      {
        label: "Refresh All Metadata",
        click: sendMenuAction("refresh.all"),
      },
      {
        label: "Cancel Metadata Refresh",
        click: sendMenuAction("refresh.cancel"),
      },
    ];
  };

  const settingsItem: Electron.MenuItemConstructorOptions = {
    label: "Settings",
    accelerator: accelerator("app.settings"),
    click: navTo("/settings"),
  };

  const template: Electron.MenuItemConstructorOptions[] = [
    ...(isMac
      ? [
          {
            label: app.name,
            submenu: [
              {
                role: "about" as const,
                label: `About ${app.name}`,
              },
              { type: "separator" as const },
              {
                label: "Check for Updates",
                click: navTo("/settings/general"),
              },
              { type: "separator" as const },
              settingsItem,
              { type: "separator" as const },
              { role: "services" as const },
              { type: "separator" as const },
              { role: "hide" as const },
              { role: "hideOthers" as const },
              { role: "unhide" as const },
              { type: "separator" as const },
              { role: "quit" as const },
            ],
          } satisfies Electron.MenuItemConstructorOptions,
        ]
      : []),
    {
      label: "File",
      submenu: [
        {
          label: FILE_MENU_CREATE_LABELS[0],
          accelerator: accelerator("library.new-folder"),
          registerAccelerator: false,
          click: sendMenuAction("library.new-folder"),
        },
        {
          label: FILE_MENU_CREATE_LABELS[1],
          click: sendMenuAction("library.new-smart-folder"),
        },
        {
          label: FILE_MENU_CREATE_LABELS[2],
          accelerator: accelerator("library.new-note"),
          registerAccelerator: false,
          click: sendMenuAction("library.new-note"),
        },
        { type: "separator" },
        {
          label: FILE_MENU_CREATE_LABELS[3],
          accelerator: accelerator("library.import-files"),
          registerAccelerator: false,
          click: sendMenuAction("library.import-files"),
        },
        {
          label: FILE_MENU_CREATE_LABELS[4],
          accelerator: accelerator("library.import-folders"),
          registerAccelerator: false,
          click: sendMenuAction("library.import-folders"),
        },
        {
          label: FILE_MENU_CREATE_LABELS[5],
          accelerator: accelerator("library.import-links"),
          registerAccelerator: false,
          click: sendMenuAction("library.import-links"),
        },
        {
          label: FILE_MENU_CREATE_LABELS[6],
          click: sendMenuAction("library.import-package"),
        },
        {
          label: "Auto Import",
          submenu: [
            {
              label: FILE_MENU_AUTO_IMPORT_LABELS[0],
              click: sendMenuAction("library.auto-import-folder"),
            },
            {
              label: FILE_MENU_AUTO_IMPORT_LABELS[1],
              click: sendMenuAction("library.auto-import-settings"),
            },
          ],
        },
        {
          label: "Find Duplicates",
          submenu: [
            {
              label: FILE_MENU_DUPLICATES_LABELS[0],
              click: sendMenuAction("library.find-duplicates-all"),
            },
            {
              label: FILE_MENU_DUPLICATES_LABELS[1],
              click: sendMenuAction("library.find-duplicates-list"),
            },
            {
              label: FILE_MENU_DUPLICATES_LABELS[2],
              click: sendMenuAction("library.find-duplicates-selected"),
            },
          ],
        },
        { type: "separator" },
        {
          label: "Library Window",
          click: () => openLibraryWindow(),
        },
        {
          label: "Collection Window",
          click: () => {
            void import("./aux-windows").then((m) => m.openCollectionWindow());
          },
        },
        { type: "separator" },
        {
          label: "Open with Default App",
          accelerator: accelerator("save.open"),
          registerAccelerator: false,
          click: sendMenuAction("save.open-with-default"),
        },
        {
          label: "Open Original URL",
          accelerator: accelerator("save.open-url"),
          registerAccelerator: false,
          click: sendMenuAction("save.open-original"),
        },
        {
          label: "Reveal in Finder",
          accelerator: accelerator("save.reveal"),
          registerAccelerator: false,
          click: sendMenuAction("save.reveal"),
        },
        { type: "separator" },
        {
          label: "Rename",
          accelerator: accelerator("save.rename"),
          registerAccelerator: false,
          click: sendMenuAction("save.rename"),
        },
        {
          label: "Add Tag",
          accelerator: accelerator("save.add-tag"),
          registerAccelerator: false,
          click: sendMenuAction("save.add-tag"),
        },
        {
          label: "Refresh Details",
          accelerator: accelerator("save.refresh"),
          registerAccelerator: false,
          click: sendMenuAction("save.refresh"),
        },
        { type: "separator" },
        {
          label: "Move to Trash",
          accelerator: accelerator("save.trash"),
          registerAccelerator: false,
          click: sendMenuAction("save.trash"),
        },
        {
          label: "Restore from Trash",
          click: sendMenuAction("save.untrash"),
        },
        {
          label: "Delete Forever",
          accelerator: accelerator("save.delete-forever"),
          registerAccelerator: false,
          click: sendMenuAction("save.delete-forever"),
        },
        { type: "separator" },
        isMac
          ? {
              role: "close",
              label: "Close Window",
              accelerator: accelerator("app.close-window"),
            }
          : { role: "quit" },
      ],
    },
    {
      label: "Edit",
      submenu: [
        {
          label: "Undo",
          accelerator: "CmdOrCtrl+Z",
          click: () => {
            withFocusedWebContents((contents) => {
              contents.undo();
              contents.send(IPC.editUndoRequested);
            });
          },
        },
        {
          label: "Redo",
          accelerator: "CmdOrCtrl+Shift+Z",
          click: () => {
            withFocusedWebContents((contents) => {
              contents.redo();
              contents.send(IPC.editRedoRequested);
            });
          },
        },
        { type: "separator" },
        {
          label: "Cut",
          accelerator: "CmdOrCtrl+X",
          click: () => withFocusedWebContents((contents) => contents.cut()),
        },
        {
          label: "Copy",
          accelerator: "CmdOrCtrl+C",
          click: () => withFocusedWebContents((contents) => contents.copy()),
        },
        {
          label: "Paste",
          accelerator: "CmdOrCtrl+V",
          click: () => withFocusedWebContents((contents) => contents.paste()),
        },
        {
          label: "Select All",
          accelerator: "CmdOrCtrl+A",
          click: () =>
            withFocusedWebContents((contents) => contents.selectAll()),
        },
        { type: "separator" },
        {
          label: "Copy Image or Video",
          accelerator: accelerator("save.copy-image"),
          registerAccelerator: false,
          click: sendMenuAction("save.copy-media"),
        },
        {
          label: "Copy URL",
          accelerator: accelerator("save.copy-url"),
          registerAccelerator: false,
          click: sendMenuAction("save.copy-url"),
        },
        {
          label: "Copy Save ID",
          accelerator: accelerator("save.copy-id"),
          registerAccelerator: false,
          click: sendMenuAction("save.copy-id"),
        },
        { type: "separator" },
        {
          label: "Move Selected to Trash",
          click: sendMenuAction("save.bulk-trash"),
        },
        {
          label: "Refresh Selected",
          click: sendMenuAction("save.bulk-refresh"),
        },
        ...(!isMac ? [{ type: "separator" as const }, settingsItem] : []),
      ],
    },
    {
      label: "View",
      submenu: [
        {
          label: "Cycle Layout",
          accelerator: accelerator("view.layout-cycle"),
          click: sendMenuAction("view.layout.cycle"),
        },
        {
          label: "Waterfall",
          accelerator: accelerator("view.layout-waterfall"),
          registerAccelerator: false,
          click: sendMenuAction("view.layout.waterfall"),
        },
        {
          label: "Grid",
          accelerator: accelerator("view.layout-grid"),
          registerAccelerator: false,
          click: sendMenuAction("view.layout.grid"),
        },
        {
          label: "Justified",
          accelerator: accelerator("view.layout-justified"),
          registerAccelerator: false,
          click: sendMenuAction("view.layout.justified"),
        },
        {
          label: "List",
          accelerator: accelerator("view.layout-list"),
          registerAccelerator: false,
          click: sendMenuAction("view.layout.list"),
        },
        { type: "separator" },
        {
          label: "Toggle Sidebar",
          accelerator: accelerator("view.sidebar"),
          registerAccelerator: false,
          click: sendMenuAction("view.sidebar.toggle"),
        },
        {
          label: "Toggle Agent",
          accelerator: accelerator("view.agent"),
          registerAccelerator: false,
          click: sendMenuAction("view.agent.toggle"),
        },
        {
          label: "Toggle Details",
          accelerator: accelerator("view.inspector"),
          click: sendMenuAction("view.inspector.toggle"),
        },
        {
          label: "Grayscale Overlay",
          accelerator: accelerator("view.grayscale"),
          registerAccelerator: false,
          click: sendMenuAction("view.grayscale"),
        },
        {
          label: "Show Navigator",
          click: sendMenuAction("view.navigator"),
        },
        {
          label: "Appearance",
          submenu: [
            {
              label: "Light",
              click: sendMenuAction("theme.light"),
            },
            {
              label: "Dark",
              click: sendMenuAction("theme.dark"),
            },
            {
              label: "Match System",
              click: sendMenuAction("theme.system"),
            },
          ],
        },
        { type: "separator" },
        {
          label: "Zoom In",
          accelerator: accelerator("view.zoom-in"),
          click: sendMenuAction("view.zoom-in"),
        },
        {
          label: "Zoom Out",
          accelerator: accelerator("view.zoom-out"),
          click: sendMenuAction("view.zoom-out"),
        },
        {
          label: "Reset Zoom",
          accelerator: accelerator("view.zoom-reset"),
          click: sendMenuAction("view.zoom-reset"),
        },
      ],
    },
    {
      label: "Go",
      submenu: [
        {
          label: "Back",
          accelerator: accelerator("nav.back"),
          click: sendMenuAction("history.back"),
        },
        {
          label: "Forward",
          accelerator: accelerator("nav.forward"),
          click: sendMenuAction("history.forward"),
        },
        { type: "separator" },
        {
          label: "Library",
          accelerator: accelerator("nav.library"),
          registerAccelerator: false,
          click: navTo("/"),
        },
        {
          label: "Sources",
          accelerator: accelerator("nav.sources"),
          registerAccelerator: false,
          click: navTo("/sources"),
        },
        {
          label: "Downloads",
          accelerator: accelerator("nav.downloads"),
          registerAccelerator: false,
          click: navTo("/downloads"),
        },
        {
          label: "Trash",
          accelerator: accelerator("nav.trash"),
          registerAccelerator: false,
          click: navTo("/trash"),
        },
        {
          label: "Settings",
          accelerator: accelerator("nav.settings"),
          registerAccelerator: false,
          click: navTo("/settings"),
        },
        { type: "separator" },
        {
          label: "Search",
          accelerator: accelerator("library.search"),
          registerAccelerator: false,
          click: sendMenuAction("library.search"),
        },
      ],
    },
    {
      label: "History",
      submenu: recentsItems(),
    },
    {
      label: "Library",
      submenu: [
        {
          label: LIBRARY_MENU_LABELS[0],
          click: sendMenuAction("library.new"),
        },
        {
          label: LIBRARY_MENU_LABELS[1],
          click: sendMenuAction("library.open"),
        },
        { type: "separator" },
        {
          label: LIBRARY_MENU_LABELS[2],
          click: () => void shell.openPath(libraryRoot()),
        },
        {
          label: LIBRARY_MENU_LABELS[3],
          click: sendMenuAction("library.move"),
        },
        { type: "separator" },
        {
          label: LIBRARY_MENU_LABELS[4],
          click: () =>
            void reconcileLibrary().catch((err) =>
              log.warn("[pond menu] rescan failed", err),
            ),
        },
        {
          label: LIBRARY_MENU_LABELS[5],
          click: async () => {
            try {
              const { verifyLibraryIntegrity } = await import(
                "./core/library-ops"
              );
              await verifyLibraryIntegrity();
            } catch (err) {
              log.warn("[pond menu] verify failed", err);
            }
          },
        },
        { type: "separator" },
        {
          label: LIBRARY_MENU_LABELS[6],
          click: sendMenuAction("library.backup"),
        },
        {
          label: LIBRARY_MENU_LABELS[7],
          click: sendMenuAction("library.restore"),
        },
        {
          label: LIBRARY_MENU_LABELS[8],
          click: sendMenuAction("library.merge"),
        },
        { type: "separator" },
        {
          label: "Sync",
          submenu: sourcesSubmenu(),
        },
        { type: "separator" },
        {
          label: LIBRARY_MENU_LABELS[9],
          accelerator: accelerator("trash.empty"),
          click: sendMenuAction("trash.empty"),
        },
        {
          label: LIBRARY_MENU_LABELS[10],
          click: sendMenuAction("trash.restore-all"),
        },
      ],
    },
    {
      label: "Window",
      submenu: [
        { role: "minimize" },
        { role: "zoom" },
        ...(isMac
          ? ([
              { type: "separator" },
              { role: "front" },
            ] satisfies Electron.MenuItemConstructorOptions[])
          : ([
              { role: "close" },
            ] satisfies Electron.MenuItemConstructorOptions[])),
      ],
    },
    ...(!app.isPackaged
      ? ([
          {
            label: "Developer",
            submenu: [
              { role: "reload" as const },
              {
                role: "forceReload" as const,
              },
              { role: "toggleDevTools" as const },
            ],
          },
        ] satisfies Electron.MenuItemConstructorOptions[])
      : []),
    {
      label: "Help",
      role: "help",
      submenu: [
        {
          label: "Twitter",
          click: openExternalUrl("https://x.com/raphaelsalaja"),
        },
        {
          label: "GitHub",
          click: openExternalUrl("https://github.com/raphaelsalaja"),
        },
        {
          label: "Email",
          click: openExternalUrl("mailto:raphaelsalaja@gmail.com"),
        },
        { type: "separator" },
        {
          label: "Show Logs in Finder",
          click: () => void shell.openPath(app.getPath("logs")),
        },
      ],
    },
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}
