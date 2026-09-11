import { describe, expect, it } from "vitest";
import {
  EagleSmartFolderSchema,
  eaglePaletteColor,
  eagleSmartFolderQuery,
  unsupportedEagleRules,
} from "./eagle-metadata";

describe("Eagle documented metadata conversion", () => {
  it("preserves RGB palettes from the official item API representation", () => {
    expect(eaglePaletteColor({ color: [132, 236, 244] })).toBe("#84ecf4");
    expect(eaglePaletteColor("#123456")).toBe("#123456");
  });
  it("keeps a relative smart folder rolling as days pass", () => {
    expect(
      eagleSmartFolderQuery({
        id: "recent",
        name: "Last Week",
        conditions: [
          {
            match: "OR",
            rules: [{ property: "createTime", method: "within", value: [7] }],
          },
        ],
      }),
    ).toEqual({
      combinator: "or",
      rules: [{ field: "savedAt", operator: "gte", value: "-P7D" }],
    });
  });
  it("maps tag intersection without changing the group combinator", () => {
    expect(
      eagleSmartFolderQuery({
        id: "tags",
        name: "Posters",
        conditions: [
          {
            match: "AND",
            rules: [
              {
                property: "tags",
                method: "intersection",
                value: ["Poster", "Print"],
              },
            ],
          },
        ],
      }),
    ).toEqual({
      combinator: "and",
      rules: [{ field: "tags", operator: "every", value: ["Poster", "Print"] }],
    });
  });
  it("preserves separate AND/OR blocks and false conditions", () => {
    expect(
      eagleSmartFolderQuery({
        id: "combined",
        name: "Combined",
        conditions: [
          {
            match: "OR",
            boolean: "FALSE",
            rules: [{ property: "tags", method: "union", value: ["Draft"] }],
          },
          {
            match: "AND",
            rules: [{ property: "width", method: ">=", value: [1200] }],
          },
        ],
      }),
    ).toEqual({
      combinator: "and",
      rules: [
        {
          combinator: "or",
          not: true,
          rules: [{ field: "tags", operator: "some", value: ["Draft"] }],
        },
        {
          combinator: "and",
          rules: [{ field: "width", operator: "gte", value: 1200 }],
        },
      ],
    });
  });
  it("maps folder identities and exact membership sets", () => {
    expect(
      eagleSmartFolderQuery(
        {
          id: "folder",
          name: "Folder",
          conditions: [
            {
              match: "AND",
              rules: [
                {
                  property: "folders",
                  method: "equal",
                  value: ["eagle-folder"],
                },
              ],
            },
          ],
        },
        new Map([["eagle-folder", "pond-folder"]]),
      ),
    ).toEqual({
      combinator: "and",
      rules: [{ field: "folder", operator: "exact", value: ["pond-folder"] }],
    });
  });
  it("converts Eagle file-size units to bytes", () => {
    expect(
      eagleSmartFolderQuery({
        id: "size",
        name: "Large",
        conditions: [
          {
            match: "AND",
            rules: [
              {
                property: "fileSize",
                method: "between",
                value: [2, 4],
                unit: "mb",
              },
            ],
          },
        ],
      }),
    ).toEqual({
      combinator: "and",
      rules: [
        { field: "fileSize", operator: "between", value: [2097152, 4194304] },
      ],
    });
  });
  it("maps image extensions to Pond's format set operators", () => {
    expect(
      eagleSmartFolderQuery({
        id: "png",
        name: "PNG",
        conditions: [
          {
            match: "AND",
            rules: [{ property: "type", method: "equal", value: "png" }],
          },
        ],
      }),
    ).toEqual({
      combinator: "and",
      rules: [{ field: "format", operator: "some", value: ["png"] }],
    });
  });
  it("recognizes Eagle's empty-conditions Group with nested Smart Folders", () => {
    const group = EagleSmartFolderSchema.parse({
      id: "group",
      name: "Work",
      conditions: [],
      children: [{ id: "child", name: "Child", conditions: [] }],
    });
    expect(group.children).toHaveLength(1);
    expect(eagleSmartFolderQuery(group)).toEqual({
      combinator: "and",
      rules: [],
    });
  });
  it("reports the exact unsupported field and operator", () => {
    const folder = EagleSmartFolderSchema.parse({
      id: "regex",
      name: "Files",
      conditions: [
        {
          match: "AND",
          rules: [{ property: "name", method: "regex", value: "file.*" }],
        },
      ],
    });
    expect(unsupportedEagleRules(folder, new Map())).toEqual([
      "Files: name/regex",
    ]);
  });
  it("rejects the entire smart folder when one condition cannot be translated exactly", () => {
    expect(
      eagleSmartFolderQuery({
        id: "colors",
        name: "Red Posters",
        conditions: [
          {
            match: "AND",
            rules: [
              { property: "tags", method: "intersection", value: ["Poster"] },
              { property: "color", method: "similar", value: "#ff2600" },
            ],
          },
        ],
      }),
    ).toBeNull();
  });
});
