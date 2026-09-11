import type { MenuItemSpec } from "@pond/ui";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { buildTrashMenuItems } from "./trash-menu";

function labels(items: MenuItemSpec[]): string[] {
  return items.flatMap((item) => {
    if (item.type === "separator" || item.type === "custom") return [];
    const parsed = z.string().safeParse("label" in item ? item.label : null);
    return parsed.success ? [parsed.data] : [];
  });
}

describe("trash menu", () => {
  it("restores first and empties last", () => {
    expect(labels(buildTrashMenuItems())).toEqual([
      "Restore All",
      "Empty Trash",
    ]);
  });
});
