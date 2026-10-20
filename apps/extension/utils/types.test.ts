import { ExtensionSettingsSchema } from "@pond/schema/browser-extension";
import { describe, expect, it } from "vitest";
import {
  DEFAULT_SETTINGS,
  normalizeStoredSettings,
  settingsFromPond,
} from "./types";

describe("normalizeStoredSettings", () => {
  it("falls back to the defaults when nothing is stored", () => {
    expect(normalizeStoredSettings(null)).toEqual(DEFAULT_SETTINGS);
  });

  it("keeps stored source flags and fills the rest from the defaults", () => {
    const settings = normalizeStoredSettings({
      enabled: { twitter: false },
      likes: { reddit: false },
    });
    expect(settings.enabled.twitter).toBe(false);
    expect(settings.enabled.reddit).toBe(true);
    expect(settings.likes.reddit).toBe(false);
    expect(settings.likes.twitter).toBe(true);
  });

  it("reads the toolbar action and confirmations", () => {
    expect(
      normalizeStoredSettings({ toolbar: "save", confirmations: false }),
    ).toMatchObject({ toolbar: "save", confirmations: false });
  });

  it("ignores values it doesn't recognize", () => {
    expect(
      normalizeStoredSettings({ toolbar: "launch", confirmations: "no" }),
    ).toMatchObject({ toolbar: "popup", confirmations: true });
    expect(normalizeStoredSettings(["twitter"])).toEqual(DEFAULT_SETTINGS);
  });

  it("reads capture and screenshot preferences", () => {
    expect(
      normalizeStoredSettings({
        askDetails: false,
        altClick: false,
        screenshotFormat: "jpeg",
        retina: false,
        theme: "dark",
      }),
    ).toMatchObject({
      askDetails: false,
      altClick: false,
      screenshotFormat: "jpeg",
      retina: false,
      theme: "dark",
    });
    expect(
      normalizeStoredSettings({ screenshotFormat: "gif", theme: "neon" }),
    ).toMatchObject({ screenshotFormat: "png", theme: "library" });
  });
});

describe("settingsFromPond", () => {
  it("fills every site flag, keeping the ones Pond sent", () => {
    const settings = settingsFromPond(
      ExtensionSettingsSchema.parse({
        enabled: { twitter: false },
        likes: { reddit: false },
        screenshotFormat: "jpeg",
      }),
    );
    expect(settings.enabled).toEqual({
      ...DEFAULT_SETTINGS.enabled,
      twitter: false,
    });
    expect(settings.likes.reddit).toBe(false);
    expect(settings.likes.twitter).toBe(true);
    expect(settings.screenshotFormat).toBe("jpeg");
    expect(settings.askDetails).toBe(true);
  });

  it("falls back to defaults for values Pond doesn't recognize", () => {
    expect(
      settingsFromPond(ExtensionSettingsSchema.parse({ toolbar: "dock" })),
    ).toEqual(DEFAULT_SETTINGS);
  });
});
