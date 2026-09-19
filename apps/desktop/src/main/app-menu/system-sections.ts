import type { AppMenuContext, AppMenuItem } from "./types";

export function buildSettingsItem(context: AppMenuContext): AppMenuItem {
  return {
    label: "Settings",
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
          label: `About ${context.appName}`,
        },
        { type: "separator" },
        {
          label: "Check for Updates",
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
    label: "Window",
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
      label: "Developer",
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
    label: "Help",
    role: "help",
    submenu: [
      {
        label: "Twitter",
        click: context.openExternalUrl("https://x.com/raphaelsalaja"),
      },
      {
        label: "GitHub",
        click: context.openExternalUrl("https://github.com/raphaelsalaja"),
      },
      {
        label: "Email",
        click: context.openExternalUrl("mailto:raphaelsalaja@gmail.com"),
      },
      { type: "separator" },
      {
        label: "Show Logs in Finder",
        click: context.showLogs,
      },
    ],
  };
}
