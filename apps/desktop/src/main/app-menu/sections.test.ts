import { describe, expect, it } from "vitest";
import { buildGoSection, buildHistorySection } from "./navigation-sections";
import {
  buildApplicationSections,
  buildDeveloperSections,
  buildSettingsItem,
} from "./system-sections";
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
    revealLibrary: noOp,
    sendMenuAction: () => noOp,
    showLogs: noOp,
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
      submenu: [{ label: "First Save" }],
    });
  });
});
