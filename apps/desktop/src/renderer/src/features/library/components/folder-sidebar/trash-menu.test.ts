import { describe, expect, it } from "vitest";
import { topLevelMenuLabels as labels } from "@/shared/test/menu-labels";
import { buildTrashMenuItems } from "./trash-menu";

describe("trash menu", () => {
  it("matches the Trash row context menu", () => {
    const items = buildTrashMenuItems(true);
    expect(labels(items)).toEqual(["Empty Trash", "Restore All Items"]);
    expect(items[0]).toMatchObject({ variant: "destructive" });
  });

  it("disables both operations when Trash is empty", () => {
    expect(
      buildTrashMenuItems(false).map((item) =>
        "disabled" in item ? item.disabled : undefined,
      ),
    ).toEqual([true, true]);
  });
});
