import { afterEach, describe, expect, it, vi } from "vitest";
import {
  DEFAULT_SETTINGS_SECTION,
  rememberSettingsSection,
  resolveSettingsLocation,
  resolveSettingsSection,
  settingsHref,
} from "./open-settings";

describe("settings hrefs", () => {
  afterEach(() => {
    rememberSettingsSection(DEFAULT_SETTINGS_SECTION);
  });

  it("keeps canonical section paths", () => {
    expect(resolveSettingsSection("models")).toBe("models");
    expect(settingsHref("personalization")).toBe("/settings/personalization");
    expect(settingsHref("mcp")).toBe("/settings/mcp");
    expect(settingsHref("agent-models")).toBe("/settings/agent-models");
    expect(settingsHref("harvesting")).toBe("/settings/harvesting");
    expect(settingsHref("shortcuts")).toBe("/settings/shortcuts");
  });

  it("keeps the requested field anchor", () => {
    expect(
      resolveSettingsLocation("search", "#setting-search-semanticSearch"),
    ).toEqual({ section: "search", hash: "setting-search-semanticSearch" });
  });

  it("sends unknown paths to the default section", () => {
    expect(resolveSettingsSection("nope")).toBe(DEFAULT_SETTINGS_SECTION);
  });

  it("reopens the last section when none is asked for", () => {
    settingsHref("search");
    expect(settingsHref()).toBe("/settings/search");
    expect(settingsHref(undefined, "setting-search-semanticSearch")).toBe(
      "/settings/search#setting-search-semanticSearch",
    );
  });
});

it("opens a native Settings window with the canonical location instead of changing the Library route", async () => {
  const { openSettings } = await import("./open-settings");
  const requests: { section?: string; hash?: string }[] = [];
  vi.stubGlobal("window", {
    pond: {
      async openSettingsWindow(location: { section?: string; hash?: string }) {
        requests.push(location);
      },
    },
  });
  try {
    openSettings("nope", "setting-processing-enableClip");
    expect(requests).toEqual([
      {
        section: DEFAULT_SETTINGS_SECTION,
        hash: "setting-processing-enableClip",
      },
    ]);
  } finally {
    vi.unstubAllGlobals();
  }
});
