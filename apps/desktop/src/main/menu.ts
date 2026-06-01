import { SETTINGS_SECTIONS, SOURCES, sourceLabel } from "@pond/schema";
import { app, BrowserWindow, Menu, shell } from "electron";
import log from "electron-log/main.js";
import { IPC, type MenuActionId } from "../shared/constants";
import { reconcileLibrary } from "./core/scan";
import { syncAllSources, syncSource } from "./core/sync";
import { libraryRoot } from "./paths";

interface AppMenuDeps {
  focusedOrMain: () => BrowserWindow | null;
  openLibraryWindow: () => void;
}

export function installAppMenu(deps: AppMenuDeps): void {
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

  const settingsSubmenu = (): Electron.MenuItemConstructorOptions[] =>
    SETTINGS_SECTIONS.map((section) => ({
      label: section.label,
      click: navTo(`/settings/${section.path}`),
    }));

  const sourcesSubmenu = (): Electron.MenuItemConstructorOptions[] => {
    const filterItems: Electron.MenuItemConstructorOptions[] = SOURCES.map(
      (source) => ({
        label: `Filter by ${sourceLabel(source)}`,
        click: navTo(`/source/${source}`),
      }),
    );
    const syncItems: Electron.MenuItemConstructorOptions[] = SOURCES.filter(
      // Local imports have no remote to sync from.
      (source) => source !== "local",
    ).map((source) => ({
      label: `Sync ${sourceLabel(source)} Now`,
      click: () => {
        void syncSource(source, { trigger: "manual" }).catch((err) =>
          log.warn(`[pond menu] sync ${source} failed`, err),
        );
      },
    }));
    return [...filterItems, { type: "separator" }, ...syncItems];
  };

  const preferencesItem: Electron.MenuItemConstructorOptions = {
    label: "Preferences…",
    accelerator: isMac ? "Command+," : "Control+,",
    click: navTo("/settings"),
  };

  const template: Electron.MenuItemConstructorOptions[] = [
    ...(isMac
      ? [
          {
            label: app.name,
            submenu: [
              { role: "about" as const, label: `About ${app.name}` },
              { type: "separator" as const },
              {
                label: "Check for Updates…",
                click: navTo("/settings/general"),
              },
              { type: "separator" as const },
              preferencesItem,
              { label: "Settings", submenu: settingsSubmenu() },
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
          label: "New Save…",
          accelerator: "CommandOrControl+N",
          click: navTo("/?capture=1"),
        },
        { type: "separator" },
        { label: "Sources", submenu: sourcesSubmenu() },
        {
          label: "Sync All Sources",
          accelerator: "CommandOrControl+Shift+R",
          click: () => void syncAllSources({ trigger: "manual" }),
        },
        { type: "separator" },
        {
          label: "Refresh All Metadata…",
          click: sendMenuAction("refresh.all"),
        },
        {
          label: "Cancel Metadata Refresh",
          click: sendMenuAction("refresh.cancel"),
        },
        { type: "separator" },
        {
          label: "Reveal Library in Finder",
          accelerator: "CommandOrControl+Shift+O",
          click: () => void shell.openPath(libraryRoot()),
        },
        {
          label: "Move Library…",
          click: sendMenuAction("library.move"),
        },
        { type: "separator" },
        isMac ? { role: "close" } : { role: "quit" },
      ],
    },
    {
      label: "Edit",
      submenu: [
        {
          label: "Undo",
          accelerator: "CommandOrControl+Z",
          click: () => {
            const win = BrowserWindow.getFocusedWindow();
            if (!win || win.isDestroyed()) return;
            win.webContents.undo();
            win.webContents.send(IPC.editUndoRequested);
          },
        },
        {
          label: "Redo",
          accelerator: isMac ? "Command+Shift+Z" : "Control+Y",
          click: () => {
            const win = BrowserWindow.getFocusedWindow();
            if (!win || win.isDestroyed()) return;
            win.webContents.redo();
            win.webContents.send(IPC.editRedoRequested);
          },
        },
        { type: "separator" },
        { role: "cut" },
        { role: "copy" },
        { role: "paste" },
        { role: "selectAll" },
        ...(!isMac ? [{ type: "separator" as const }, preferencesItem] : []),
      ],
    },
    {
      label: "Find",
      submenu: [
        {
          label: "Command Palette…",
          accelerator: "CommandOrControl+K",
          click: sendMenuAction("palette.open"),
        },
        { type: "separator" },
        { label: "Search", click: sendMenuAction("find.search") },
        { label: "Filter", click: sendMenuAction("find.filter") },
        { type: "separator" },
        {
          label: "Go to",
          submenu: [
            { label: "Library", click: navTo("/") },
            { label: "Recents", click: navTo("/recents") },
            { label: "Random", click: navTo("/random") },
            { label: "Untagged", click: navTo("/untagged") },
            { label: "Trash", click: navTo("/trash") },
            { label: "Settings", click: navTo("/settings") },
          ],
        },
      ],
    },
    {
      label: "Save",
      submenu: [
        {
          label: "Open in Detail View",
          click: sendMenuAction("save.open-detail"),
        },
        {
          label: "Open with Default App",
          click: sendMenuAction("save.open-with-default"),
        },
        {
          label: "Open Original URL",
          click: sendMenuAction("save.open-original"),
        },
        {
          label: "Reveal in Finder",
          click: sendMenuAction("save.reveal"),
        },
        { type: "separator" },
        {
          label: "Copy URL",
          accelerator: "CommandOrControl+Shift+,",
          click: sendMenuAction("save.copy-url"),
        },
        {
          label: "Copy Save ID",
          accelerator: "CommandOrControl+.",
          click: sendMenuAction("save.copy-id"),
        },
        { type: "separator" },
        {
          label: "Rename",
          click: sendMenuAction("save.rename"),
        },
        {
          label: "Add Tag",
          click: sendMenuAction("save.add-tag"),
        },
        {
          label: "Refresh Metadata",
          click: sendMenuAction("save.refresh"),
        },
        { type: "separator" },
        {
          label: "Move to Trash",
          click: sendMenuAction("save.trash"),
        },
        {
          label: "Restore from Trash",
          click: sendMenuAction("save.untrash"),
        },
        {
          label: "Delete Forever",
          accelerator: "CommandOrControl+Backspace",
          click: sendMenuAction("save.delete-forever"),
        },
        { type: "separator" },
        {
          label: "Bulk",
          submenu: [
            {
              label: "Move Selected to Trash",
              click: sendMenuAction("save.bulk-trash"),
            },
            {
              label: "Refresh Selected",
              click: sendMenuAction("save.bulk-refresh"),
            },
          ],
        },
      ],
    },
    {
      label: "Library",
      submenu: [
        {
          label: "All Saves",
          accelerator: "Control+CommandOrControl+1",
          click: navTo("/"),
        },
        {
          label: "Recents",
          accelerator: "Control+CommandOrControl+2",
          click: navTo("/recents"),
        },
        {
          label: "Random",
          accelerator: "Control+CommandOrControl+3",
          click: navTo("/random"),
        },
        {
          label: "Untagged",
          accelerator: "Control+CommandOrControl+4",
          click: navTo("/untagged"),
        },
        {
          label: "Trash",
          accelerator: "Control+CommandOrControl+5",
          click: navTo("/trash"),
        },
        { type: "separator" },
        { type: "separator" },
        {
          label: "Rescan Library",
          click: () =>
            void reconcileLibrary().catch((err) =>
              log.warn("[pond menu] rescan failed", err),
            ),
        },
        {
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
          label: "Empty Trash",
          click: sendMenuAction("trash.empty"),
        },
        {
          label: "Restore All from Trash",
          click: sendMenuAction("trash.restore-all"),
        },
      ],
    },
    {
      label: "View",
      submenu: [
        {
          label: "Toggle Sidebar",
          accelerator: isMac ? "Alt+Command+1" : "Alt+Control+1",
          click: sendMenuAction("view.sidebar.toggle"),
        },
        {
          label: "Toggle Inspector",
          accelerator: isMac ? "Alt+Command+2" : "Alt+Control+2",
          click: sendMenuAction("view.inspector.toggle"),
        },
        { type: "separator" },
        {
          label: "Cycle Layout",
          accelerator: "CommandOrControl+B",
          click: sendMenuAction("view.layout.cycle"),
        },
        {
          label: "Layout",
          submenu: [
            {
              label: "Waterfall",
              click: sendMenuAction("view.layout.waterfall"),
            },
            { label: "Grid", click: sendMenuAction("view.layout.grid") },
            {
              label: "Justified",
              click: sendMenuAction("view.layout.justified"),
            },
            { label: "List", click: sendMenuAction("view.layout.list") },
          ],
        },
        { type: "separator" },
        {
          label: "Theme",
          submenu: [
            { label: "Light", click: sendMenuAction("theme.light") },
            { label: "Dark", click: sendMenuAction("theme.dark") },
            { label: "Match System", click: sendMenuAction("theme.system") },
          ],
        },
        { type: "separator" },
        { role: "resetZoom" },
        { role: "zoomIn" },
        { role: "zoomOut" },
        { type: "separator" },
        { role: "togglefullscreen" },
        ...(!app.isPackaged
          ? ([
              { type: "separator" },
              { role: "reload" },
              { role: "forceReload" },
              { role: "toggleDevTools" },
            ] satisfies Electron.MenuItemConstructorOptions[])
          : []),
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
              { type: "separator" },
              {
                label: "Library",
                accelerator: "CommandOrControl+Shift+P",
                click: () => openLibraryWindow(),
              },
            ] satisfies Electron.MenuItemConstructorOptions[])
          : ([
              { role: "close" },
            ] satisfies Electron.MenuItemConstructorOptions[])),
      ],
    },
    {
      label: "Help",
      role: "help",
      submenu: [
        {
          label: "Pond on GitHub",
          click: openExternalUrl("https://github.com/raphaelsalaja/pond"),
        },
        {
          label: "Report an Issue…",
          click: openExternalUrl(
            "https://github.com/raphaelsalaja/pond/issues/new",
          ),
        },
        { type: "separator" },
        {
          label: "Show Logs in Finder",
          click: () => void shell.openPath(app.getPath("logs")),
        },
        ...(!app.isPackaged
          ? ([
              { type: "separator" as const },
              {
                label: "Developer",
                submenu: [
                  {
                    label: "Restart Local API",
                    click: sendMenuAction("developer.restart-api"),
                  },
                  {
                    label: "Open Developer Logs",
                    click: sendMenuAction("developer.open-logs"),
                  },
                  {
                    label: "Open IPC Inspector",
                    click: sendMenuAction("developer.ipc-inspector"),
                  },
                ],
              },
            ] satisfies Electron.MenuItemConstructorOptions[])
          : []),
      ],
    },
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}
