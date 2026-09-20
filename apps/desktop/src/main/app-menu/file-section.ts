import {
  FILE_MENU_AUTO_IMPORT_LABELS,
  FILE_MENU_CREATE_LABELS,
  FILE_MENU_DUPLICATES_LABELS,
} from "../file-menu";
import type { AppMenuContext, AppMenuItem } from "./types";

export function buildFileSection(context: AppMenuContext): AppMenuItem {
  const { accelerator, sendMenuAction } = context;

  return {
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
      {
        label: "Capture Screenshot",
        accelerator: accelerator("library.capture-screenshot"),
        registerAccelerator: false,
        click: sendMenuAction("library.capture-screenshot"),
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
        click: context.openLibraryWindow,
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
      context.isMac
        ? {
            role: "close",
            label: "Close Window",
            accelerator: accelerator("app.close-window"),
          }
        : { role: "quit" },
    ],
  };
}
