import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS, normalizeStoredSettings } from "./types";

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
});
