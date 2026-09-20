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
        {
          label: context.translate("main.lock"),
          accelerator: context.accelerator("app.lock"),
          click: context.sendMenuAction("security.lock"),
        },
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
      ...(context.isMac
        ? ([{ type: "separator" }, { role: "front" }] satisfies AppMenuItem[])
        : ([{ role: "close" }] satisfies AppMenuItem[])),
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
        label: context.translate("main.twitter"),
        click: context.openExternalUrl("https://x.com/raphaelsalaja"),
      },
      {
        label: context.translate("main.github"),
        click: context.openExternalUrl("https://github.com/raphaelsalaja"),
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
