import {
  createMemoryHistory,
  createRootRoute,
  createRouter,
} from "@tanstack/react-router";
import { afterEach, describe, expect, it } from "vitest";
import { setAppRouter } from "./app-router";
import {
  DEFAULT_SETTINGS_SECTION,
  openSettings,
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
      resolveSettingsLocation(
        "processing",
        "#setting-processing-semanticSearch",
      ),
    ).toEqual({
      section: "processing",
      hash: "setting-processing-semanticSearch",
    });
  });

  it("sends unknown paths to the default section", () => {
    expect(resolveSettingsSection("nope")).toBe(DEFAULT_SETTINGS_SECTION);
  });

  it("reopens the last section when none is asked for", () => {
    settingsHref("processing");
    expect(settingsHref()).toBe("/settings/processing");
    expect(settingsHref(undefined, "setting-processing-semanticSearch")).toBe(
      "/settings/processing#setting-processing-semanticSearch",
    );
  });
});

it("opens Settings inside the Library window at the canonical location", () => {
  const router = createRouter({
    routeTree: createRootRoute(),
    history: createMemoryHistory(),
  });
  setAppRouter(router);
  openSettings("nope", "setting-processing-enableClip");
  expect(router.history.location.href).toBe(
    `/settings/${DEFAULT_SETTINGS_SECTION}#setting-processing-enableClip`,
  );
});
