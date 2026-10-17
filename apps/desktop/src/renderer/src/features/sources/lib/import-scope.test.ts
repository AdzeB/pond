import { describe, expect, it } from "vitest";
import { importScopeRows, sinceForPreset } from "./import-scope";

describe("sinceForPreset", () => {
  const now = new Date(2026, 9, 17, 15, 30);

  it("counts back whole months from today", () => {
    expect(sinceForPreset("month", now)).toBe("2026-09-17");
    expect(sinceForPreset("quarter", now)).toBe("2026-07-17");
    expect(sinceForPreset("year", now)).toBe("2025-10-17");
  });

  it("leaves the date empty for any time and a custom date", () => {
    expect(sinceForPreset("any", now)).toBe("");
    expect(sinceForPreset("custom", now)).toBe("");
  });
});

describe("importScopeRows", () => {
  it("lists every choice X offers", () => {
    expect(
      importScopeRows("twitter", {
        listKinds: ["saved"],
        collections: [{ id: "1", name: "Design" }],
        addToFolders: false,
        mediaKinds: ["image"],
      }),
    ).toEqual([
      { label: "Lists", value: "Bookmarks" },
      { label: "Folders", value: "Design" },
      { label: "Add to Folders", value: "Off" },
      { label: "Kinds of Posts", value: "Images" },
      { label: "Posted Since", value: "Any Time" },
    ]);
  });

  it("hides collections while the saved list is off", () => {
    expect(
      importScopeRows("instagram", { listKinds: ["liked"] }).map(
        (r) => r.label,
      ),
    ).toEqual(["Lists", "Kinds of Posts", "Posted Since"]);
  });
});
