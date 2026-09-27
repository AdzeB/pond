import type { savedViews } from "@pond/schema/db";
import type { Query } from "@pond/schema/filters/types";
import { describe, expect, it } from "vitest";
import { selectionViews } from "./export-saves";

function view(
  id: string,
  input: {
    kind?: "saved_view" | "smart_folder" | "group";
    parentId?: string | null;
    query?: Query;
  } = {},
): typeof savedViews.$inferSelect {
  return {
    id,
    name: id,
    kind: input.kind ?? "saved_view",
    parentId: input.parentId ?? null,
    question: null,
    query: input.query ?? { combinator: "and", not: false, rules: [] },
    sortKey: "savedAt",
    sortDir: "desc",
    layout: null,
    sortOrder: 0,
    createdAt: new Date(1),
  };
}

describe("selection organization export", () => {
  it("keeps compatible views and their groups without broadening lost folder predicates", () => {
    const rows = [
      view("group", { kind: "group" }),
      view("included", {
        kind: "smart_folder",
        parentId: "group",
        query: {
          combinator: "and",
          not: false,
          rules: [
            { field: "folder", operator: "some", value: ["selected-folder"] },
          ],
        },
      }),
      view("missing-folder", {
        query: {
          combinator: "and",
          not: false,
          rules: [
            { field: "folder", operator: "some", value: ["other-folder"] },
          ],
        },
      }),
      view("global"),
    ];

    expect(
      selectionViews(rows, new Set(["selected-folder"])).map((row) => row.id),
    ).toEqual(["group", "included", "global"]);
  });
});
