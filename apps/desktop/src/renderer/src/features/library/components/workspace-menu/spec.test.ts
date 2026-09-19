// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { menuLabels, topLevelMenuLabels } from "@/shared/test/menu-labels";
import { buildWorkspaceMenuItems, downloadBrowserExtension } from "./spec";

describe("workspace menu spec", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("lists app, release, and contact actions without submenus", () => {
    const items = buildWorkspaceMenuItems();
    const labels = [
      "Settings",
      "Check for Updates",
      "Download Browser Extension",
      "Twitter",
      "GitHub",
      "Email",
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
    ]);
    for (const label of [
      "Settings",
      "Check for Updates",
      "Download Browser Extension",
    ]) {
      const item = items.find(
        (candidate) =>
          candidate.type !== "separator" &&
          candidate.type !== "custom" &&
          candidate.label === label,
      );
      expect(item && "icon" in item ? item.icon : null).not.toBeNull();
    }
    expect(labels.join(" ")).not.toContain("…");
    expect(labels.join(" ")).not.toContain("...");
  });

  it("downloads the browser extension from the latest release", async () => {
    const openExternal = vi.fn(async () => ({ ok: true }));
    const fetchLatest = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            assets: [
              {
                name: "pond-extension-1.2.3.zip",
                browser_download_url:
                  "https://github.com/raphaelsalaja/pond/releases/download/v1.2.3/pond-extension-1.2.3.zip",
              },
            ],
          }),
        ),
    );
    vi.stubGlobal("fetch", fetchLatest);
    vi.stubGlobal("pond", { openExternal });

    await downloadBrowserExtension();

    expect(fetchLatest).toHaveBeenCalledWith(
      "https://api.github.com/repos/raphaelsalaja/pond/releases/latest",
    );
    expect(openExternal).toHaveBeenCalledWith(
      "https://github.com/raphaelsalaja/pond/releases/download/v1.2.3/pond-extension-1.2.3.zip",
    );
  });
});
