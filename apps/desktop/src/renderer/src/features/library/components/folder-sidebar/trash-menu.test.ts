import { describe, expect, it } from "vitest";
import { topLevelMenuLabels as labels } from "@/shared/test/menu-labels";
import { buildTrashMenuItems } from "./trash-menu";

describe("trash menu", () => {
  it("restores first and empties last", () => {
    expect(labels(buildTrashMenuItems())).toEqual([
      "Restore All",
      "Empty Trash",
    ]);
  });
});
