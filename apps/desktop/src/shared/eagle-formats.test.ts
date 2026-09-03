import { describe, expect, it } from "vitest";
import {
  EAGLE_CORE_EXTENSIONS,
  EAGLE_FORMAT_GROUPS,
  EAGLE_PLUGIN_EXTENSIONS,
  EAGLE_SUPPORTED_EXTENSIONS,
} from "./eagle-formats";

describe("Eagle format compatibility", () => {
  it("contains the installed Eagle core manifest without duplicates", () => {
    expect(EAGLE_CORE_EXTENSIONS).toHaveLength(126);
    expect(new Set(EAGLE_CORE_EXTENSIONS).size).toBe(126);
  });

  it("assigns every supported extension to a compatibility group", () => {
    const grouped = new Set<string>(Object.values(EAGLE_FORMAT_GROUPS).flat());
    expect(
      [...EAGLE_SUPPORTED_EXTENSIONS].filter(
        (extension) => !grouped.has(extension),
      ),
    ).toEqual([]);
  });

  it("adds official extension and compatibility formats", () => {
    expect(EAGLE_PLUGIN_EXTENSIONS).toHaveLength(17);
    expect(EAGLE_SUPPORTED_EXTENSIONS.size).toBe(143);
    expect(EAGLE_PLUGIN_EXTENSIONS).toEqual(
      expect.arrayContaining([
        "epub",
        "swf",
        "livp",
        "base64",
        "blender",
        "webarchive",
        "zip",
        "rar",
        "7z",
        "av1",
        "hevc",
        "rm",
        "rmvb",
        "vp8",
        "vp9",
        "mpeg",
        "ogv",
      ]),
    );
  });

  it("does not put undocumented entries in the grouped contract", () => {
    const grouped = new Set<string>(Object.values(EAGLE_FORMAT_GROUPS).flat());
    expect(grouped).toEqual(EAGLE_SUPPORTED_EXTENSIONS);
  });

  it.each([
    "psd",
    "psb",
    "ai",
    "afdesign",
    "cr3",
    "docx",
    "numbers",
    "3mf",
    "ttc",
    "epub",
    "swf",
  ])("covers .%s", (extension) => {
    expect(EAGLE_SUPPORTED_EXTENSIONS.has(extension)).toBe(true);
  });
});
