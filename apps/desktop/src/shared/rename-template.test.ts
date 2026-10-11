import { describe, expect, it } from "vitest";
import { applyRenameTemplate, literalReplacement } from "./rename-template";

describe("applyRenameTemplate", () => {
  it("expands portable Save and organization tokens", () => {
    expect(
      applyRenameTemplate(
        "{n:4} {title} {id} {family} {date} {tags} {original}",
        {
          index: 2,
          start: 7,
          title: "Current",
          id: "save-1",
          family: "Inter",
          date: "2026-09-19T08:30:00Z",
          tags: ["Design", "Type"],
          original: "Original File",
        },
      ),
    ).toBe("0009 Current save-1 Inter 2026-09-19 Design, Type Original File");
  });

  it("uses configured padding and supports regex replacement", () => {
    expect(
      applyRenameTemplate("{n} {title}", {
        index: 0,
        start: 3,
        padding: 3,
        title: "IMG_2026_IMG",
        id: "save-1",
        replacement: { find: "IMG", replace: "Photo", flags: "g" },
      }),
    ).toBe("003 Photo_2026_Photo");
  });

  it("supports compact, year, month, and timestamp date formats", () => {
    expect(
      applyRenameTemplate(
        "{date:compact} {date:year} {date:month} {date:timestamp}",
        {
          index: 0,
          title: "Current",
          id: "save-1",
          date: "2026-09-19T08:30:45Z",
        },
      ),
    ).toBe("20260919 2026 2026-09 20260919-083045");
  });

  it("replaces literal text, including regex and replacement symbols", () => {
    expect(
      applyRenameTemplate("{title}", {
        index: 0,
        title: "IMG (1).png $1",
        id: "save-1",
        replacement: literalReplacement("(1).png $1", "$& done"),
      }),
    ).toBe("IMG $& done");
  });

  it("applies upper, lower, and title case after expanding tokens", () => {
    const values = { index: 0, title: "hero-final v3", id: "save-1" };
    expect(
      applyRenameTemplate("{title}", { ...values, textCase: "upper" }),
    ).toBe("HERO-FINAL V3");
    expect(
      applyRenameTemplate("{n} {title}", { ...values, textCase: "lower" }),
    ).toBe("1 hero-final v3");
    expect(
      applyRenameTemplate("{title}", { ...values, textCase: "title" }),
    ).toBe("Hero-Final V3");
  });

  it("keeps unknown tokens literal and rejects invalid regex flags", () => {
    expect(
      applyRenameTemplate("{title} {unknown}", {
        index: 0,
        title: "Name",
        id: "save-1",
      }),
    ).toBe("Name {unknown}");
    expect(() =>
      applyRenameTemplate("{title}", {
        index: 0,
        title: "Name",
        id: "save-1",
        replacement: { find: "Name", replace: "Other", flags: "gg" },
      }),
    ).toThrow();
  });
});
