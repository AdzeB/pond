// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/ui/library-layout-transition", () => ({
  beginLibraryLayoutTransition: vi.fn(),
}));

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
    expect(libraryChrome.getState().sidebarWidth).toBe(220);
    libraryChrome.setSidebarWidth(200);
    expect(libraryChrome.getState().sidebarWidth).toBe(220);
    expect(localStorage.getItem("pond.sidebarWidth")).toBe("220");
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

  it("collapses the whole slot instead of swapping during a columns toggle", async () => {
    const { libraryChrome } = await import("./library-chrome");
    libraryChrome.inspectSave("first");
    libraryChrome.toggleAgent();
    libraryChrome.toggleRightPane();
    expect(libraryChrome.getState().rightPane).toBeNull();
    libraryChrome.toggleRightPane();
    expect(libraryChrome.getState().rightPane).toBe("inspector");
  });
});
