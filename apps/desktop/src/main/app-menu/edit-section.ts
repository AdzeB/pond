import type { AppMenuContext, AppMenuItem } from "./types";

export function buildEditSection(
  context: AppMenuContext,
  settingsItem: AppMenuItem,
): AppMenuItem {
  const { accelerator, sendMenuAction } = context;

  return {
    label: "Edit",
    submenu: [
      {
        label: "Undo",
        accelerator: "CmdOrCtrl+Z",
        click: context.edit.undo,
      },
      {
        label: "Redo",
        accelerator: "CmdOrCtrl+Shift+Z",
        click: context.edit.redo,
      },
      { type: "separator" },
      {
        label: "Cut",
        accelerator: "CmdOrCtrl+X",
        click: context.edit.cut,
      },
      {
        label: "Copy",
        accelerator: "CmdOrCtrl+C",
        click: context.edit.copy,
      },
      {
        label: "Paste",
        accelerator: "CmdOrCtrl+V",
        click: context.edit.paste,
      },
      {
        label: "Select All",
        accelerator: "CmdOrCtrl+A",
        click: context.edit.selectAll,
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
      ...(!context.isMac ? [{ type: "separator" as const }, settingsItem] : []),
    ],
  };
}
