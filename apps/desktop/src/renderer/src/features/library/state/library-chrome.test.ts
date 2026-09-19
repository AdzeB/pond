import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("independent Agent and inspector panes", () => {
  beforeEach(() => {
    vi.resetModules();
    const memory = new Map<string, string>();
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => memory.get(key) ?? null,
      setItem: (key: string, value: string) => memory.set(key, value),
    });
  });

  afterEach(() => vi.unstubAllGlobals());

  it("raises old sidebar widths to the tab-safe minimum", async () => {
    localStorage.setItem("pond.sidebarWidth", "180");
    const { libraryChrome } = await import("./library-chrome");
    expect(libraryChrome.getState().sidebarWidth).toBe(256);
    libraryChrome.setSidebarWidth(200);
    expect(libraryChrome.getState().sidebarWidth).toBe(256);
    expect(localStorage.getItem("pond.sidebarWidth")).toBe("256");
  });

  it("preserves the saved sidebar width through closing and reopening", async () => {
    const { libraryChrome } = await import("./library-chrome");
    libraryChrome.setSidebarWidth(300);
    libraryChrome.toggleSidebar();
    expect(libraryChrome.getState().sidebarOpen).toBe(false);
    libraryChrome.toggleSidebar();
    expect(libraryChrome.getState().sidebarOpen).toBe(true);
    expect(libraryChrome.getState().sidebarWidth).toBe(300);
  });

  it("opens Details without changing the library Agent preference", async () => {
    localStorage.setItem("pond.agent", "0");
    const { libraryChrome } = await import("./library-chrome");
    libraryChrome.inspectSave("first");
    expect(libraryChrome.getState().rightPane).toBe("inspector");
    expect(localStorage.getItem("pond.agent")).toBe("0");
    libraryChrome.inspectSave(null);
    expect(libraryChrome.getState().rightPane).toBeNull();
  });

  it("reopens the selected download after closing Details or showing Agent", async () => {
    const { libraryChrome } = await import("./library-chrome");
    libraryChrome.inspectDownload("first");
    expect(libraryChrome.getState()).toMatchObject({
      rightPane: "inspector",
      inspectorSaveId: "first",
      inspectorMode: "download",
    });
    libraryChrome.closeRightPane();
    libraryChrome.inspectDownload("first");
    expect(libraryChrome.getState().rightPane).toBe("inspector");
    libraryChrome.toggleAgent();
    libraryChrome.inspectDownload("first");
    expect(libraryChrome.getState().rightPane).toBe("inspector");
  });

  it("restores save details when opening a download's save", async () => {
    const { libraryChrome } = await import("./library-chrome");
    libraryChrome.inspectDownload("first");
    libraryChrome.inspectSave("first");
    expect(libraryChrome.getState()).toMatchObject({
      rightPane: "inspector",
      inspectorSaveId: "first",
      inspectorMode: "save",
    });
    libraryChrome.inspectDownload("first");
    libraryChrome.setInspectorSaveId("second");
    expect(libraryChrome.getState()).toMatchObject({
      inspectorSaveId: "second",
      inspectorMode: "save",
    });
  });

  it("swaps Details and Agent without losing the inspected save", async () => {
    const { libraryChrome } = await import("./library-chrome");
    libraryChrome.inspectSave("first");
    libraryChrome.toggleAgent();
    expect(libraryChrome.getState().rightPane).toBe("agent");
    expect(libraryChrome.getState().inspectorSaveId).toBe("first");
    libraryChrome.toggleAgent();
    expect(libraryChrome.getState().rightPane).toBe("inspector");
    expect(libraryChrome.getState().inspectorSaveId).toBe("first");
  });

  it("does not override an explicit swap when the same save resolves again", async () => {
    const { libraryChrome } = await import("./library-chrome");
    libraryChrome.inspectSave("first");
    libraryChrome.toggleAgent();
    libraryChrome.inspectSave("first");
    expect(libraryChrome.getState().rightPane).toBe("agent");
    libraryChrome.openSaveDetails("first");
    expect(libraryChrome.getState().rightPane).toBe("inspector");
    libraryChrome.closeRightPane();
    libraryChrome.openSaveDetails("first");
    expect(libraryChrome.getState().rightPane).toBe("inspector");
    libraryChrome.inspectSave("second");
    expect(libraryChrome.getState().rightPane).toBe("inspector");
    expect(libraryChrome.getState().inspectorSaveId).toBe("second");
  });

  it("closes and reopens Details without closing the save", async () => {
    const { libraryChrome } = await import("./library-chrome");
    libraryChrome.inspectSave("first");
    libraryChrome.closeRightPane();
    expect(libraryChrome.getState().rightPane).toBeNull();
    expect(libraryChrome.getState().inspectorSaveId).toBe("first");
    libraryChrome.toggleInspector();
    expect(libraryChrome.getState().rightPane).toBe("inspector");
    libraryChrome.toggleInspector();
    expect(libraryChrome.getState().rightPane).toBeNull();
  });

  it("can select Details directly while Agent is visible", async () => {
    const { libraryChrome } = await import("./library-chrome");
    libraryChrome.inspectSave("first");
    libraryChrome.toggleAgent();
    libraryChrome.toggleInspector();
    expect(libraryChrome.getState().rightPane).toBe("inspector");
    libraryChrome.inspectSave(null);
    expect(libraryChrome.getState().rightPane).toBe("agent");
  });

  it("only toggles Agent when no save is open", async () => {
    const { libraryChrome } = await import("./library-chrome");
    expect(libraryChrome.getState().rightPane).toBeNull();
    libraryChrome.toggleInspector();
    expect(libraryChrome.getState().rightPane).toBeNull();
    libraryChrome.toggleAgent();
    expect(libraryChrome.getState().rightPane).toBe("agent");
    libraryChrome.toggleAgent();
    expect(libraryChrome.getState().rightPane).toBeNull();
    libraryChrome.toggleAgent();
    expect(libraryChrome.getState().rightPane).toBe("agent");
  });

  it("remembers a save for Details without opening the pane", async () => {
    const { libraryChrome } = await import("./library-chrome");
    libraryChrome.setAgentOpen(true);
    libraryChrome.setInspectorSaveId("first");
    expect(libraryChrome.getState().rightPane).toBe("agent");
    expect(libraryChrome.getState().inspectorSaveId).toBe("first");
    libraryChrome.setInspectorSaveId("second");
    expect(libraryChrome.getState().rightPane).toBe("agent");
    expect(libraryChrome.getState().inspectorSaveId).toBe("second");
  });

  it("collapses the whole slot instead of swapping during a columns toggle", async () => {
    const { libraryChrome } = await import("./library-chrome");
    libraryChrome.inspectSave("first");
    libraryChrome.toggleAgent();
    libraryChrome.toggleRightPane();
    expect(libraryChrome.getState().rightPane).toBeNull();
    libraryChrome.toggleRightPane();
    expect(libraryChrome.getState().rightPane).toBe("inspector");
  });

  it("opens connection details in the inspector slot", async () => {
    const { libraryChrome } = await import("./library-chrome");
    libraryChrome.inspectSource("account", "acc-1");
    expect(libraryChrome.getState()).toMatchObject({
      rightPane: "inspector",
      inspectorMode: "source",
      inspectorSourceId: "acc-1",
      inspectorSourceKind: "account",
    });
    libraryChrome.closeRightPane();
    libraryChrome.inspectSource("account", "acc-1");
    expect(libraryChrome.getState().rightPane).toBe("inspector");
  });

  it("restores connection details after Agent and clears them on disconnect", async () => {
    const { libraryChrome } = await import("./library-chrome");
    libraryChrome.inspectSource("watch", "watch-1");
    libraryChrome.toggleAgent();
    expect(libraryChrome.getState().rightPane).toBe("agent");
    expect(libraryChrome.getState().inspectorSourceId).toBe("watch-1");
    libraryChrome.toggleAgent();
    expect(libraryChrome.getState()).toMatchObject({
      rightPane: "inspector",
      inspectorMode: "source",
    });
    libraryChrome.clearSourceInspector();
    expect(libraryChrome.getState()).toMatchObject({
      rightPane: null,
      inspectorSourceId: null,
      inspectorSourceKind: null,
      inspectorMode: "save",
    });
  });
});
