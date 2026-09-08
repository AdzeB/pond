import { SOURCES, sourceLabel } from "@pond/schema";
import { app, BrowserWindow, Menu, shell } from "electron";
import log from "electron-log/main.js";
import {
  IPC,
  type MenuActionId,
  type RecentMenuEntry,
} from "../shared/constants";
import { reconcileLibrary } from "./core/scan";
import { syncAllSources, syncSource } from "./core/sync";
import { sym } from "./lib/menu-symbol";
import { libraryRoot } from "./paths";

interface AppMenuDeps {
  focusedOrMain: () => BrowserWindow | null;
  openLibraryWindow: () => void;
}

const RECENTS_MENU_CAP = 12;

let activeDeps: AppMenuDeps | null = null;
let recentEntries: RecentMenuEntry[] = [];

export function setMenuRecents(entries: RecentMenuEntry[]): void {
  recentEntries = entries.slice(0, RECENTS_MENU_CAP);
  if (activeDeps) buildAndSetMenu(activeDeps);
}

export function installAppMenu(deps: AppMenuDeps): void {
  activeDeps = deps;
  buildAndSetMenu(deps);
}

function buildAndSetMenu(deps: AppMenuDeps): void {
  const { focusedOrMain, openLibraryWindow } = deps;
  const isMac = process.platform === "darwin";

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
      ...sym("clock"),
      label: entry.title,
      click: openRecent(entry.id),
    }));
  };

  const sourcesSubmenu = (): Electron.MenuItemConstructorOptions[] => {
    const syncItems: Electron.MenuItemConstructorOptions[] = SOURCES.filter(
      (source) => source !== "local",
    ).map((source) => ({
      ...sym("arrow.triangle.2.circlepath"),
      label: `Sync ${sourceLabel(source)}`,
      click: () => {
        void syncSource(source, { trigger: "manual" }).catch((err) =>
          log.warn(`[pond menu] sync ${source} failed`, err),
        );
      },
    }));
    return [
      {
        ...sym("arrow.triangle.2.circlepath"),
        label: "Sync All",
        accelerator: "CmdOrCtrl+Shift+S",
        registerAccelerator: false,
        click: () => void syncAllSources({ trigger: "manual" }),
      },
      ...syncItems,
      { type: "separator" },
      {
        ...sym("arrow.clockwise"),
        label: "Refresh All Metadata",
        click: sendMenuAction("refresh.all"),
      },
      {
        ...sym("xmark.circle"),
        label: "Cancel Metadata Refresh",
        click: sendMenuAction("refresh.cancel"),
      },
    ];
  };

  const settingsItem: Electron.MenuItemConstructorOptions = {
    ...sym("gearshape"),
    label: "Settings",
    accelerator: "CmdOrCtrl+,",
    click: navTo("/settings"),
  };

  const template: Electron.MenuItemConstructorOptions[] = [
    ...(isMac
      ? [
          {
            label: app.name,
            submenu: [
              {
                ...sym("info.circle"),
                role: "about" as const,
                label: `About ${app.name}`,
              },
              { type: "separator" as const },
              {
                ...sym("arrow.triangle.2.circlepath"),
                label: "Check for Updates",
                click: navTo("/settings/general"),
              },
              { type: "separator" as const },
              settingsItem,
              { type: "separator" as const },
              { role: "services" as const },
              { type: "separator" as const },
              { ...sym("eye.slash"), role: "hide" as const },
              { ...sym("eye"), role: "hideOthers" as const },
              { ...sym("eye"), role: "unhide" as const },
              { type: "separator" as const },
              { ...sym("power"), role: "quit" as const },
            ],
          } satisfies Electron.MenuItemConstructorOptions,
        ]
      : []),
    {
      label: "File",
      submenu: [
        {
          ...sym("xmark"),
          role: "close",
          label: "Close Window",
          accelerator: "CmdOrCtrl+W",
        },
        {
          ...sym("books.vertical"),
          label: "Open Library",
          click: () => openLibraryWindow(),
        },
        {
          ...sym("square.and.arrow.down"),
          label: "Collection Window",
          click: () => {
            void import("./aux-windows").then((m) => m.openCollectionWindow());
          },
        },
        {
          ...sym("camera"),
          label: "Screenshot Display",
          click: () => {
            void import("./core/screenshot").then((m) => m.captureDisplay());
          },
        },
        {
          ...sym("camera.viewfinder"),
          label: "Screenshot Area",
          click: () => {
            void import("./aux-windows").then((m) => m.openCaptureWindow());
          },
        },
        {
          ...sym("macwindow"),
          label: "Screenshot Window",
          click: () => {
            void import("./core/screenshot").then((m) => m.captureWindow());
          },
        },
        { type: "separator" },
        {
          ...sym("arrow.up.forward.app"),
          label: "Open with Default App",
          accelerator: "O",
          registerAccelerator: false,
          click: sendMenuAction("save.open-with-default"),
        },
        {
          ...sym("globe"),
          label: "Open Original URL",
          click: sendMenuAction("save.open-original"),
        },
        {
          ...sym("folder"),
          label: "Reveal in Finder",
          click: sendMenuAction("save.reveal"),
        },
        { type: "separator" },
        {
          ...sym("pencil"),
          label: "Rename",
          click: sendMenuAction("save.rename"),
        },
        {
          ...sym("tag"),
          label: "Add Tag",
          click: sendMenuAction("save.add-tag"),
        },
        {
          ...sym("arrow.clockwise"),
          label: "Refresh Details",
          accelerator: "R",
          registerAccelerator: false,
          click: sendMenuAction("save.refresh"),
        },
        { type: "separator" },
        {
          ...sym("trash"),
          label: "Move to Trash",
          accelerator: "Backspace",
          registerAccelerator: false,
          click: sendMenuAction("save.trash"),
        },
        {
          ...sym("arrow.uturn.backward"),
          label: "Restore from Trash",
          click: sendMenuAction("save.untrash"),
        },
        {
          ...sym("trash.fill"),
          label: "Delete Forever",
          accelerator: "CmdOrCtrl+Backspace",
          registerAccelerator: false,
          click: sendMenuAction("save.delete-forever"),
        },
        { type: "separator" },
        isMac
          ? { ...sym("xmark"), role: "close" }
          : { ...sym("power"), role: "quit" },
      ],
    },
    {
      label: "Edit",
      submenu: [
        {
          ...sym("arrow.uturn.backward"),
          label: "Undo",
          accelerator: "CmdOrCtrl+Z",
          click: () => {
            const win = BrowserWindow.getFocusedWindow();
            if (!win || win.isDestroyed()) return;
            win.webContents.undo();
            win.webContents.send(IPC.editUndoRequested);
          },
        },
        {
          ...sym("arrow.uturn.forward"),
          label: "Redo",
          accelerator: "CmdOrCtrl+Shift+Z",
          click: () => {
            const win = BrowserWindow.getFocusedWindow();
            if (!win || win.isDestroyed()) return;
            win.webContents.redo();
            win.webContents.send(IPC.editRedoRequested);
          },
        },
        { type: "separator" },
        { ...sym("scissors"), role: "cut" },
        { ...sym("doc.on.doc"), role: "copy" },
        { ...sym("doc.on.clipboard"), role: "paste" },
        { ...sym("checkmark.square"), role: "selectAll" },
        { type: "separator" },
        {
          ...sym("photo.on.rectangle"),
          label: "Copy Image or Video",
          accelerator: "C",
          registerAccelerator: false,
          click: sendMenuAction("save.copy-media"),
        },
        {
          ...sym("link"),
          label: "Copy URL",
          accelerator: "CmdOrCtrl+Shift+C",
          registerAccelerator: false,
          click: sendMenuAction("save.copy-url"),
        },
        {
          ...sym("number"),
          label: "Copy Save ID",
          click: sendMenuAction("save.copy-id"),
        },
        { type: "separator" },
        {
          ...sym("trash"),
          label: "Move Selected to Trash",
          click: sendMenuAction("save.bulk-trash"),
        },
        {
          ...sym("arrow.clockwise"),
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
          ...sym("rectangle.3.group"),
          label: "Cycle Layout",
          accelerator: "CmdOrCtrl+Shift+L",
          click: sendMenuAction("view.layout.cycle"),
        },
        {
          ...sym("rectangle.stack"),
          label: "Waterfall",
          click: sendMenuAction("view.layout.waterfall"),
        },
        {
          ...sym("square.grid.2x2"),
          label: "Grid",
          click: sendMenuAction("view.layout.grid"),
        },
        {
          ...sym("rectangle.split.3x1"),
          label: "Justified",
          click: sendMenuAction("view.layout.justified"),
        },
        {
          ...sym("list.bullet"),
          label: "List",
          click: sendMenuAction("view.layout.list"),
        },
        { type: "separator" },
        {
          ...sym("sidebar.left"),
          label: "Toggle Sidebar",
          accelerator: "[",
          registerAccelerator: false,
          click: sendMenuAction("view.sidebar.toggle"),
        },
        {
          ...sym("sidebar.right"),
          label: "Toggle Assistant",
          accelerator: "]",
          registerAccelerator: false,
          click: sendMenuAction("view.agent.toggle"),
        },
        {
          ...sym("sidebar.right"),
          label: "Toggle Details",
          accelerator: "CmdOrCtrl+I",
          click: sendMenuAction("view.inspector.toggle"),
        },
        {
          ...sym("circle.lefthalf.filled"),
          label: "Appearance",
          submenu: [
            {
              ...sym("sun.max"),
              label: "Light",
              click: sendMenuAction("theme.light"),
            },
            {
              ...sym("moon"),
              label: "Dark",
              click: sendMenuAction("theme.dark"),
            },
            {
              ...sym("circle.lefthalf.filled"),
              label: "Match System",
              click: sendMenuAction("theme.system"),
            },
          ],
        },
        { type: "separator" },
        {
          ...sym("plus.magnifyingglass"),
          label: "Zoom In",
          accelerator: "CmdOrCtrl+=",
          click: sendMenuAction("view.zoom-in"),
        },
        {
          ...sym("minus.magnifyingglass"),
          label: "Zoom Out",
          accelerator: "CmdOrCtrl+-",
          click: sendMenuAction("view.zoom-out"),
        },
        {
          ...sym("1.magnifyingglass"),
          label: "Reset Zoom",
          accelerator: "CmdOrCtrl+0",
          click: sendMenuAction("view.zoom-reset"),
        },
        { type: "separator" },
        {
          ...sym("arrow.up.left.and.arrow.down.right"),
          role: "togglefullscreen",
        },
      ],
    },
    {
      label: "Go",
      submenu: [
        {
          ...sym("chevron.left"),
          label: "Back",
          accelerator: "CmdOrCtrl+[",
          click: sendMenuAction("history.back"),
        },
        {
          ...sym("chevron.right"),
          label: "Forward",
          accelerator: "CmdOrCtrl+]",
          click: sendMenuAction("history.forward"),
        },
        { type: "separator" },
        {
          ...sym("square.grid.2x2"),
          label: "Library",
          accelerator: "G L",
          registerAccelerator: false,
          click: navTo("/"),
        },
        {
          ...sym("square.stack.3d.up"),
          label: "Sources",
          accelerator: "G S",
          registerAccelerator: false,
          click: navTo("/sources"),
        },
        {
          ...sym("arrow.down.to.line"),
          label: "Downloads",
          accelerator: "G D",
          registerAccelerator: false,
          click: navTo("/downloads"),
        },
        {
          ...sym("trash"),
          label: "Trash",
          accelerator: "G T",
          registerAccelerator: false,
          click: navTo("/trash"),
        },
        {
          ...sym("gearshape"),
          label: "Settings",
          accelerator: "G ,",
          registerAccelerator: false,
          click: navTo("/settings"),
        },
        { type: "separator" },
        {
          ...sym("magnifyingglass"),
          label: "Search",
          accelerator: "CmdOrCtrl+K",
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
          ...sym("folder"),
          label: "Reveal Library in Finder",
          click: () => void shell.openPath(libraryRoot()),
        },
        {
          ...sym("folder.badge.gearshape"),
          label: "Move Library",
          click: sendMenuAction("library.move"),
        },
        { type: "separator" },
        {
          ...sym("arrow.clockwise"),
          label: "Rescan Library",
          click: () =>
            void reconcileLibrary().catch((err) =>
              log.warn("[pond menu] rescan failed", err),
            ),
        },
        {
          ...sym("checkmark.seal"),
          label: "Verify Integrity",
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
          ...sym("arrow.triangle.2.circlepath"),
          label: "Sync",
          submenu: sourcesSubmenu(),
        },
        { type: "separator" },
        {
          ...sym("trash"),
          label: "Empty Trash",
          accelerator: "CmdOrCtrl+Shift+Backspace",
          click: sendMenuAction("trash.empty"),
        },
        {
          ...sym("arrow.uturn.backward"),
          label: "Restore All from Trash",
          click: sendMenuAction("trash.restore-all"),
        },
      ],
    },
    {
      label: "Window",
      submenu: [
        { ...sym("minus"), role: "minimize" },
        { ...sym("plus"), role: "zoom" },
        ...(isMac
          ? ([
              { type: "separator" },
              { ...sym("macwindow.on.rectangle"), role: "front" },
            ] satisfies Electron.MenuItemConstructorOptions[])
          : ([
              { ...sym("xmark"), role: "close" },
            ] satisfies Electron.MenuItemConstructorOptions[])),
      ],
    },
    ...(!app.isPackaged
      ? ([
          {
            label: "Developer",
            submenu: [
              {
                ...sym("square.grid.2x2"),
                label: "Components",
                click: navTo("/dev/components"),
              },
              {
                ...sym("rectangle.on.rectangle"),
                label: "Card Renders",
                click: navTo("/dev/cards"),
              },
              {
                ...sym("speaker.wave.2"),
                label: "Sounds",
                click: navTo("/dev/sounds"),
              },
              { type: "separator" as const },
              { ...sym("arrow.clockwise"), role: "reload" as const },
              {
                ...sym("arrow.clockwise.circle"),
                role: "forceReload" as const,
              },
              { ...sym("hammer"), role: "toggleDevTools" as const },
            ],
          },
        ] satisfies Electron.MenuItemConstructorOptions[])
      : []),
    {
      label: "Help",
      role: "help",
      submenu: [
        {
          ...sym("at"),
          label: "Twitter",
          click: openExternalUrl("https://x.com/raphaelsalaja"),
        },
        {
          ...sym("chevron.left.forwardslash.chevron.right"),
          label: "GitHub",
          click: openExternalUrl("https://github.com/raphaelsalaja"),
        },
        {
          ...sym("envelope"),
          label: "Email",
          click: openExternalUrl("mailto:raphaelsalaja@gmail.com"),
        },
        { type: "separator" },
        {
          ...sym("folder"),
          label: "Show Logs in Finder",
          click: () => void shell.openPath(app.getPath("logs")),
        },
      ],
    },
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}
