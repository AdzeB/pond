import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  mapEagleShortcuts,
  normalizeEagleShortcut,
  parseEagleShortcuts,
  readEagleShortcuts,
} from "./eagle-shortcuts";

describe("Eagle shortcut conversion", () => {
  it("normalizes spaced and compact Eagle chords", () => {
    expect(normalizeEagleShortcut("Command + Option + E")).toBe("Mod+Alt+E");
    expect(normalizeEagleShortcut("Command+Shift+C")).toBe("Mod+Shift+C");
    expect(normalizeEagleShortcut("Command + Up")).toBe("Mod+ArrowUp");
  });

  it("maps semantic equivalents and ignores unsupported actions", () => {
    expect(
      mapEagleShortcuts(
        {
          "organize.tag.add": "Command + T",
          "view.layout.grid": "Option + 1",
          "edit.image.crop": "Shift + C",
        },
        "darwin",
      ),
    ).toEqual({
      "save.add-tag": "Mod+T",
      "view.layout-grid": "Alt+1",
    });
  });

  it("uses the current platform variant and rejects invalid bindings", () => {
    const keybinds = {
      "edit.rename.darwin": "Command + R",
      "edit.rename.win32": "F2",
      "view.file.openfinder": "not a shortcut",
    };
    expect(mapEagleShortcuts(keybinds, "darwin")).toEqual({
      "save.rename": "Mod+R",
    });
    expect(mapEagleShortcuts(keybinds, "win32")).toEqual({
      "save.rename": "F2",
    });
  });
});

describe("Eagle Settings parsing", () => {
  it("reads only the shortcut keybinds from the settings document", () => {
    const result = parseEagleShortcuts(
      JSON.stringify({
        preferences: {
          shortcuts: {
            keybinds: {
              "organize.tag.add": "Command + T",
            },
          },
          developer: { apiToken: "private" },
        },
      }),
      "darwin",
    );
    expect(result).toEqual({
      status: "available",
      overrides: { "save.add-tag": "Mod+T" },
    });
    expect(JSON.stringify(result)).not.toContain("private");
  });

  it("reports malformed and missing settings without throwing", async () => {
    expect(parseEagleShortcuts("{", "darwin")).toEqual({
      status: "invalid",
      overrides: {},
    });
    const dir = await mkdtemp(join(tmpdir(), "pond-eagle-shortcuts-"));
    expect(await readEagleShortcuts(join(dir, "missing"), "darwin")).toEqual({
      status: "missing",
      overrides: {},
    });
    const path = join(dir, "Settings");
    await writeFile(path, JSON.stringify({ preferences: {} }));
    expect(await readEagleShortcuts(path, "darwin")).toEqual({
      status: "invalid",
      overrides: {},
    });
  });
});
