// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { menuLabels, topLevelMenuLabels } from "@/shared/test/menu-labels";
import { buildWorkspaceMenuItems } from "./spec";

function findItem(
  items: ReturnType<typeof buildWorkspaceMenuItems>,
  label: string,
) {
  return items.find(
    (candidate) =>
      candidate.type !== "separator" &&
      candidate.type !== "custom" &&
      candidate.label === label,
  );
}

describe("workspace menu spec", () => {
  it("lists app, release, and contact actions without submenus", () => {
    const items = buildWorkspaceMenuItems({ onBrowserExtension: () => {} });
    const labels = [
      "Settings",
      "Check for Updates",
      "Browser Extension",
      "Twitter",
      "GitHub",
      "Email",
      "Buy Me a Coffee",
    ];
    expect(menuLabels(items)).toEqual(labels);
    expect(topLevelMenuLabels(items)).toEqual(labels);
    expect(items.map((item) => item.type ?? "item")).toEqual([
      "item",
      "separator",
      "item",
      "item",
      "separator",
      "item",
      "item",
      "item",
      "separator",
      "item",
    ]);
    for (const label of [
      "Settings",
      "Check for Updates",
      "Browser Extension",
    ]) {
      const item = findItem(items, label);
      expect(item && "icon" in item ? item.icon : null).not.toBeNull();
    }
    expect(labels.join(" ")).not.toContain("…");
    expect(labels.join(" ")).not.toContain("...");
  });

  it("opens the browser extension dialog", () => {
    const onBrowserExtension = vi.fn();
    const item = findItem(
      buildWorkspaceMenuItems({ onBrowserExtension }),
      "Browser Extension",
    );
    if (!item || !("onClick" in item) || !item.onClick)
      throw new Error("Missing Browser Extension item");
    item.onClick();
    expect(onBrowserExtension).toHaveBeenCalledOnce();
  });
});
