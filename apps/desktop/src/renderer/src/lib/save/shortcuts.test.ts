import { describe, expect, it } from "vitest";
import type { ShortcutDef } from "./shortcuts";
import { chordGlyphs, SHORTCUTS, shortcutGlyphs } from "./shortcuts";

describe("shortcut registry", () => {
  it("leaves Tab available for keyboard focus navigation", () => {
    const shortcuts: readonly ShortcutDef[] = Object.values(SHORTCUTS);
    const tabShortcuts = shortcuts.filter(
      (shortcut) => shortcut.keys === "Tab",
    );

    expect(tabShortcuts).toEqual([]);
    expect(SHORTCUTS["view.sidebar"].keys).toBe("[");
  });
});

describe("chordGlyphs", () => {
  it("keeps command-comma as two keys", () => {
    const keys = chordGlyphs("Mod+,");
    expect(keys.length).toBeGreaterThanOrEqual(2);
    expect(keys.at(-1)).toBe(",");
    expect(keys[0]).not.toContain(",");
  });

  it("keeps other punctuation chords as two keys", () => {
    for (const [chord, key] of [
      ["Mod+/", "/"],
      ["Mod+=", "="],
      ["Mod+-", "-"],
      ["Mod+[", "["],
      ["Mod+]", "]"],
    ] as const) {
      const keys = chordGlyphs(chord);
      expect(keys.at(-1)).toBe(key);
      expect(keys[0]).not.toContain(key);
    }
  });

  it("leaves Escape as one token", () => {
    expect(chordGlyphs("Escape")).toEqual(["Esc"]);
  });
});

describe("shortcutGlyphs", () => {
  it("splits Settings into modifier then comma", () => {
    const keys = shortcutGlyphs("app.settings");
    expect(keys.at(-1)).toBe(",");
    expect(keys.length).toBeGreaterThanOrEqual(2);
  });

  it("keeps Go to Settings as G then comma", () => {
    expect(shortcutGlyphs("nav.settings")).toEqual(["G", ","]);
  });
});
