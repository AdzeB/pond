import { describe, expect, it } from "vitest";
import {
  PrefsSchema,
  darkPresets,
  lightPresets,
  resolveActiveTheme,
  themeCssVars,
  THEME_PRESETS,
} from "@pond/schema/db";

describe("theme prefs rebuild", () => {
  it("defaults to dual light/dark sides under system appearance", () => {
    const prefs = PrefsSchema.parse({});
    expect(prefs.preferences.appearance).toBe("system");
    expect(prefs.preferences.lightPresetId).toBe("light");
    expect(prefs.preferences.darkPresetId).toBe("dark");
    expect(prefs.preferences.light.background).toBe("#ffffff");
    expect(prefs.preferences.dark.background).toBe("#0A0A0A");
    expect(prefs.preferences.light.foreground).toBeTruthy();
    expect(prefs.preferences.dark.foreground).toBeTruthy();
  });

  it("ships ~15 light and ~15 dark presets", () => {
    expect(lightPresets()).toHaveLength(15);
    expect(darkPresets()).toHaveLength(15);
    expect(THEME_PRESETS).toHaveLength(30);
  });

  it("migrates legacy preset mode", () => {
    const prefs = PrefsSchema.parse({
      preferences: { themeMode: "preset", presetId: "mint" },
    });
    expect(prefs.preferences.appearance).toBe("light");
    expect(prefs.preferences.lightPresetId).toBe("mint");
    expect(prefs.preferences.light.accent).toBe("#0CA678");
  });

  it("migrates legacy custom dark base into the dark side", () => {
    const prefs = PrefsSchema.parse({
      preferences: {
        themeMode: "custom",
        custom: { base: "#0A0A0A", accent: "#ff0000", contrast: 40 },
      },
    });
    expect(prefs.preferences.appearance).toBe("dark");
    expect(prefs.preferences.dark.accent).toBe("#ff0000");
    expect(prefs.preferences.dark.background).toBe("#0A0A0A");
    expect(prefs.preferences.dark.contrast).toBe(40);
  });

  it("resolves active theme from appearance + system preference", () => {
    const prefs = PrefsSchema.parse({});
    expect(resolveActiveTheme(prefs, false).background).toBe("#ffffff");
    expect(resolveActiveTheme(prefs, true).background).toBe("#0A0A0A");
  });

  it("emits css anchors from themeCssVars", () => {
    const prefs = PrefsSchema.parse({});
    const v = themeCssVars(prefs.preferences.light);
    expect(v.isDark).toBe(false);
    expect(v.bgL).toBeGreaterThan(0.9);
    expect(v.fgL).toBeLessThan(0.4);
    expect(v.background).toBe("#ffffff");
  });
});
