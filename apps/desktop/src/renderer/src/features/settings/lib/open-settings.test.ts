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
    expect(settingsHref("providers")).toBe("/settings/models");
    expect(settingsHref("intelligence")).toBe("/settings/models");
    expect(settingsHref("personalization")).toBe("/settings/personalization");
    expect(settingsHref("personalisation")).toBe("/settings/personalization");
    expect(settingsHref("mcp")).toBe("/settings/mcp");
    expect(settingsHref("models", "setting-models-mcp")).toBe("/settings/mcp");
    expect(settingsHref("agent-models")).toBe("/settings/agent-models");
    expect(settingsHref("schedule")).toBe("/settings/harvesting");
    expect(settingsHref("harvesting")).toBe("/settings/harvesting");
    expect(settingsHref("downloads")).toBe("/settings/harvesting");
    expect(settingsHref("shortcuts")).toBe("/settings/shortcuts");
    expect(settingsHref("hotkeys")).toBe("/settings/shortcuts");
    expect(settingsHref("preview")).toBe("/settings/viewer");
  });

  it("redirects legacy merged-page fields", () => {
    expect(settingsHref("images", "setting-images-format")).toBe(
      "/settings/harvesting#setting-harvesting-format",
    );
    expect(settingsHref("trash", "setting-trash-autoEmptyDays")).toBe(
      "/settings/library#setting-library-autoEmptyDays",
    );
    expect(settingsHref("storage", "setting-storage-identity")).toBe(
      "/settings/library#setting-library-identity",
    );
    expect(settingsHref("storage", "setting-storage-backup")).toBe(
      "/settings/backups#setting-backups-backup",
    );
    expect(settingsHref("storage", "setting-storage-watched-folder")).toBe(
      "/settings/harvesting",
    );
    expect(
      settingsHref("harvesting", "setting-harvesting-watched-folder"),
    ).toBe("/settings/harvesting");
    expect(settingsHref("search", "setting-search-enableClip")).toBe(
      "/settings/processing#setting-processing-enableClip",
    );
  });

  it("resolves direct legacy locations before route rendering", () => {
    expect(
      resolveSettingsLocation("videos", "setting-videos-container"),
    ).toEqual({
      section: "harvesting",
      hash: "setting-harvesting-container",
    });
    expect(
      resolveSettingsLocation("search", "setting-search-semanticSearch"),
    ).toEqual({
      section: "search",
      hash: "setting-search-semanticSearch",
    });
  });

  it("maps aliases and unknown paths onto real sections", () => {
    expect(resolveSettingsSection("agent")).toBe("models");
    expect(resolveSettingsSection("enrichment")).toBe("processing");
    expect(resolveSettingsSection("nope")).toBe(DEFAULT_SETTINGS_SECTION);
    expect(settingsHref("ai-models")).toBe("/settings/agent-models");
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
    openSettings("search", "setting-search-enableClip");
    expect(requests).toEqual([
      { section: "processing", hash: "setting-processing-enableClip" },
    ]);
  } finally {
    vi.unstubAllGlobals();
  }
});
