import { afterEach, describe, expect, it } from "vitest";
import {
  DEFAULT_SETTINGS_SECTION,
  rememberSettingsSection,
  resolveSettingsSection,
  settingsHref,
} from "./open-settings";

describe("settings hrefs", () => {
  afterEach(() => {
    rememberSettingsSection(DEFAULT_SETTINGS_SECTION);
  });

  it("keeps canonical section paths", () => {
    expect(resolveSettingsSection("models")).toBe("models");
    expect(settingsHref("mcp")).toBe("/settings/models");
    expect(settingsHref("schedule")).toBe("/settings/videos");
    expect(settingsHref("harvesting")).toBe("/settings/videos");
    expect(settingsHref("downloads")).toBe("/settings/videos");
  });

  it("preserves fields when opening merged pages", () => {
    expect(settingsHref("images", "setting-images-format")).toBe(
      "/settings/videos#setting-videos-format",
    );
    expect(settingsHref("trash", "setting-trash-autoEmptyDays")).toBe(
      "/settings/storage#setting-storage-autoEmptyDays",
    );
  });

  it("maps aliases and unknown paths onto real sections", () => {
    expect(resolveSettingsSection("agent")).toBe("models");
    expect(resolveSettingsSection("enrichment")).toBe("search");
    expect(resolveSettingsSection("nope")).toBe(DEFAULT_SETTINGS_SECTION);
    expect(settingsHref("ai-models")).toBe("/settings/models");
  });

  it("reopens the last section when none is asked for", () => {
    settingsHref("search");
    expect(settingsHref()).toBe("/settings/search");
    expect(settingsHref(undefined, "setting-search-nlCompiler")).toBe(
      "/settings/search#setting-search-nlCompiler",
    );
  });
});
