import type { AppMenuContext, AppMenuItem } from "./types";

export function buildSettingsItem(context: AppMenuContext): AppMenuItem {
  return {
    label: context.translate("main.settings"),
    accelerator: context.accelerator("app.settings"),
    registerAccelerator: false,
    click: context.navTo("/settings"),
  };
}

export function buildApplicationSections(
  context: AppMenuContext,
  settingsItem: AppMenuItem,
): AppMenuItem[] {
  if (!context.isMac) return [];

  return [
    {
      label: context.appName,
      submenu: [
        {
          role: "about",
          label: context.translate("main.about", {
            appName: context.appName,
          }),
        },
        { type: "separator" },
        {
          label: context.translate("main.checkUpdates"),
          click: context.navTo("/settings/general"),
        },
        { type: "separator" },
        settingsItem,
        { type: "separator" },
        { role: "services" },
        { type: "separator" },
        { role: "hide" },
        { role: "hideOthers" },
        { role: "unhide" },
        { type: "separator" },
        { role: "quit" },
      ],
    },
  ];
}

export function buildWindowSection(context: AppMenuContext): AppMenuItem {
  return {
    label: context.translate("main.window"),
    submenu: [
      { role: "minimize" },
      { role: "zoom" },
      { role: "close" },
      { role: "togglefullscreen" },
      ...(context.isMac
        ? ([{ type: "separator" }, { role: "front" }] satisfies AppMenuItem[])
        : []),
    ],
  };
}

export function buildDeveloperSections(context: AppMenuContext): AppMenuItem[] {
  if (context.isPackaged) return [];

  return [
    {
      label: context.translate("main.developer"),
      submenu: [
        { role: "reload" },
        { role: "forceReload" },
        { role: "toggleDevTools" },
      ],
    },
  ];
}

export function buildHelpSection(context: AppMenuContext): AppMenuItem {
  return {
    label: context.translate("main.help"),
    role: "help",
    submenu: [
      {
        label: "Help Center",
        click: context.openExternalUrl(
          "https://github.com/raphaelsalaja/pond#readme",
        ),
      },
      {
        label: "Keyboard Shortcuts",
        click: context.sendMenuAction("help.shortcuts"),
      },
      {
        label: "Export Debug Report",
        click: context.sendMenuAction("help.export-debug-report"),
      },
      { type: "separator" },
      {
        label: "Report an Issue",
        click: context.openExternalUrl(
          "https://github.com/raphaelsalaja/pond/issues",
        ),
      },
      {
        label: "Release Notes",
        click: context.openExternalUrl(
          "https://github.com/raphaelsalaja/pond/releases",
        ),
      },
      {
        label: context.translate("main.email"),
        click: context.openExternalUrl("mailto:raphaelsalaja@gmail.com"),
      },
      { type: "separator" },
      {
        label: context.translate("main.showLogs"),
        click: context.showLogs,
      },
    ],
  };
}
