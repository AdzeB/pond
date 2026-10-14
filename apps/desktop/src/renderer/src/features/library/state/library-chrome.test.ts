import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("independent Assistant and inspector panes", () => {
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

  it("opens Details without changing the library Assistant preference", async () => {
    localStorage.setItem("pond.agent", "0");
    const { libraryChrome } = await import("./library-chrome");
    expect(libraryChrome.getState().rightPane).toBeNull();
    libraryChrome.openSaveDetails("first");
    expect(libraryChrome.getState().rightPane).toBe("inspector");
    expect(localStorage.getItem("pond.agent")).toBe("0");
    libraryChrome.inspectSave(null);
    expect(libraryChrome.getState().rightPane).toBe("agent");
  });

  it("opens a save directly on its Properties tab", async () => {
    const { libraryChrome } = await import("./library-chrome");
    libraryChrome.openSaveDetails("first", "info");
    expect(libraryChrome.getState()).toMatchObject({
      rightPane: "inspector",
      inspectorSaveId: "first",
      inspectorTab: "info",
    });
    libraryChrome.setInspectorTab("organize");
    expect(libraryChrome.getState().inspectorTab).toBe("organize");
    libraryChrome.setInspectorTab("info");
    expect(libraryChrome.getState().inspectorTab).toBe("info");
  });

  it("swaps Details and Assistant without losing the inspected save", async () => {
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

  it("can select Details directly while Assistant is visible", async () => {
    const { libraryChrome } = await import("./library-chrome");
    libraryChrome.inspectSave("first");
    libraryChrome.toggleAgent();
    libraryChrome.toggleInspector();
    expect(libraryChrome.getState().rightPane).toBe("inspector");
    libraryChrome.inspectSave(null);
    expect(libraryChrome.getState().rightPane).toBe("agent");
  });

  it("only toggles Assistant when no save is open", async () => {
    const { libraryChrome } = await import("./library-chrome");
    expect(libraryChrome.getState().rightPane).toBe("agent");
    libraryChrome.toggleInspector();
    expect(libraryChrome.getState().rightPane).toBe("agent");
    libraryChrome.toggleAgent();
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

  it("keeps the right panel open until the user closes it", async () => {
    const { libraryChrome } = await import("./library-chrome");
    expect(libraryChrome.getState().rightPane).toBe("agent");
    libraryChrome.inspectSave("first");
    libraryChrome.inspectSave(null);
    expect(libraryChrome.getState().rightPane).toBe("agent");
    expect(localStorage.getItem("pond.rightOpen")).toBeNull();
    libraryChrome.closeRightPane();
    expect(libraryChrome.getState().rightPane).toBeNull();
    expect(localStorage.getItem("pond.rightOpen")).toBe("0");
    libraryChrome.inspectSave("second");
    expect(libraryChrome.getState()).toMatchObject({
      rightPane: null,
      inspectorSaveId: "second",
    });
    libraryChrome.openSaveDetails("second");
    expect(libraryChrome.getState().rightPane).toBe("inspector");
    expect(localStorage.getItem("pond.rightOpen")).toBe("1");
  });

  it("restores a closed right panel", async () => {
    localStorage.setItem("pond.rightOpen", "0");
    const { libraryChrome } = await import("./library-chrome");
    expect(libraryChrome.getState().rightPane).toBeNull();
    libraryChrome.inspectSave("first");
    expect(libraryChrome.getState().rightPane).toBeNull();
  });
});
