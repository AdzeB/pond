import { describe, expect, it } from "vitest";
import {
  createCopyTranslator,
  createTranslator,
} from "../../shared/localization";
import { buildEditSection } from "./edit-section";
import { buildFileSection } from "./file-section";
import { buildFindSection } from "./find-section";
import { buildGoSection, buildHistorySection } from "./navigation-sections";
import { buildOrganizeSection } from "./organize-section";
import {
  buildApplicationSections,
  buildDeveloperSections,
  buildHelpSection,
  buildSettingsItem,
  buildWindowSection,
} from "./system-sections";
import { buildAppMenuTemplate } from "./template";
import type { AppMenuContext } from "./types";

function createContext({
  isMac,
  isPackaged,
}: {
  isMac: boolean;
  isPackaged: boolean;
}): AppMenuContext {
  const noOp = () => undefined;

  return {
    accelerator: (id) => id,
    appName: "Pond",
    edit: {
      copy: noOp,
      cut: noOp,
      paste: noOp,
      redo: noOp,
      selectAll: noOp,
      undo: noOp,
    },
    isMac,
    isPackaged,
    navTo: () => noOp,
    openExternalUrl: () => noOp,
    openLibraryWindow: noOp,
    openRecent: () => noOp,
    rescanLibrary: noOp,
    reloadLibrary: noOp,
    revealLibrary: noOp,
    sendMenuAction: () => noOp,
    showLogs: noOp,
    translate: createTranslator("en"),
    translateCopy: createCopyTranslator("en"),
    verifyLibrary: noOp,
  };
}

describe("app menu sections", () => {
  it("keeps platform sections conditional", () => {
    const mac = createContext({ isMac: true, isPackaged: true });
    const settingsItem = buildSettingsItem(mac);

    expect(buildApplicationSections(mac, settingsItem)).toEqual([
      expect.objectContaining({
        label: "Pond",
        submenu: expect.arrayContaining([
          expect.objectContaining({ role: "about", label: "About Pond" }),
          expect.objectContaining({ label: "Check for Updates" }),
        ]),
      }),
    ]);
    expect(buildDeveloperSections(mac)).toEqual([]);

    const development = createContext({
      isMac: false,
      isPackaged: false,
    });
    expect(
      buildApplicationSections(development, buildSettingsItem(development)),
    ).toEqual([]);
    expect(buildDeveloperSections(development)).toMatchObject([
      { label: "Developer" },
    ]);
  });

  it("keeps navigation and empty history labels", () => {
    const context = createContext({ isMac: true, isPackaged: true });

    expect(buildGoSection(context)).toEqual(
      expect.objectContaining({
        label: "Go",
        submenu: expect.arrayContaining([
          expect.objectContaining({
            label: "Back",
            registerAccelerator: false,
          }),
          expect.objectContaining({
            label: "Forward",
            registerAccelerator: false,
          }),
        ]),
      }),
    );
    expect(buildHistorySection(context, [])).toEqual({
      label: "History",
      submenu: [{ label: "No Recent Items", enabled: false }],
    });
    expect(
      buildHistorySection(context, [{ id: "save-1", title: "First Save" }]),
    ).toMatchObject({
      label: "History",
      submenu: [
        { label: "First Save" },
        { type: "separator" },
        { label: "Clear History" },
      ],
    });
  });

  it("orders first-party native menu sections", () => {
    const context = createContext({ isMac: true, isPackaged: true });
    const template = buildAppMenuTemplate(context, []);
    expect(template.map((item) => item.label)).toEqual([
      "Pond",
      "File",
      "Edit",
      "Find",
      "Organize",
      "View",
      "Go",
      "History",
      "Library",
      "Window",
      "Help",
    ]);
  });

  it("backfills Window and Help commands", () => {
    const context = createContext({ isMac: true, isPackaged: true });
    expect(buildWindowSection(context).submenu).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ role: "togglefullscreen" }),
      ]),
    );
    expect(buildHelpSection(context).submenu).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: "Keyboard Shortcuts" }),
        expect.objectContaining({ label: "Export Debug Report" }),
        expect.objectContaining({ label: "Report an Issue" }),
      ]),
    );
  });

  it("dispatches native Find, Organize, File, and Edit actions", () => {
    const context = createContext({ isMac: true, isPackaged: true });
    const actions: string[] = [];
    context.sendMenuAction = (id) => {
      actions.push(id);
      return () => undefined;
    };
    const settingsItem = buildSettingsItem(context);
    buildFileSection(context);
    buildEditSection(context, settingsItem);
    buildFindSection(context);
    buildOrganizeSection(context);

    expect(actions).toEqual(
      expect.arrayContaining([
        "library.new-smart-folder-group",
        "library.import-eagle",
        "save.export-files",
        "save.export-converted",
        "save.export-eagle-package",
        "save.export-pond-package",
        "save.export-csv",
        "selection.select-all",
        "selection.clear",
        "selection.invert",
        "save.copy-name",
        "save.copy-file-path",
        "save.copy-pond-link",
        "save.remove-current-folder",
        "find.search",
        "find.search-all",
        "find.go-to-folder",
        "find.filters.toggle",
        "find.filters.reset",
        "find.visual-search",
        "organize.rating.0",
        "organize.rating.5",
        "organize.clear-tags",
        "organize.copy-tags",
        "organize.paste-tags",
      ]),
    );
  });

  it("uses the save action language in native menus", () => {
    const context = createContext({ isMac: true, isPackaged: true });
    const file = buildFileSection(context).submenu ?? [];
    const organize = buildOrganizeSection(context).submenu ?? [];

    expect(file).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: "Open Original in Browser" }),
        expect.objectContaining({ label: "Add Tags" }),
        expect.objectContaining({ label: "Refresh from Source" }),
      ]),
    );
    expect(organize).toEqual(
      expect.arrayContaining([expect.objectContaining({ label: "Add Tags" })]),
    );
  });
});
