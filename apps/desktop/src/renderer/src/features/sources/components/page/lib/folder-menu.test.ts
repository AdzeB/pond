// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { pickWatchedFolder } from "@/features/sources/lib/watched-folder";
import {
  watchedFolderFlow,
  watchedFolderRevision,
} from "@/features/sources/state/watched-folder-flow";
import { menuLabels } from "@/shared/test/menu-labels";
import { buildFolderMenu } from "./folder-menu";

describe("buildFolderMenu", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("offers pause while watching and resume when off", () => {
    const target = { name: "PNG", imported: 200, watching: true };
    expect(menuLabels(buildFolderMenu(target, () => {}))).toEqual([
      "Reveal in Finder",
      "Change Folder",
      "Pause Watching",
      "Stop Watching",
    ]);
    expect(
      menuLabels(buildFolderMenu({ ...target, watching: false }, () => {})),
    ).toContain("Resume Watching");
  });

  it("pauses the folder and refreshes", async () => {
    const query = vi.fn(async () => ({ ok: true }));
    vi.stubGlobal("pond", { query });
    const onChanged = vi.fn();
    const pause = buildFolderMenu(
      { name: "PNG", imported: 200, watching: true },
      onChanged,
    )
      .flatMap((item) => (item.type === "group" ? item.items : []))
      .find((item) => "label" in item && item.label === "Pause Watching");
    if (!pause || !("onClick" in pause)) throw new Error("Missing pause");
    pause.onClick?.();
    await vi.waitFor(() => expect(onChanged).toHaveBeenCalled());
    expect(query).toHaveBeenCalledWith("autoImport.set", { enabled: false });
  });
});

describe("pickWatchedFolder", () => {
  beforeEach(() => {
    watchedFolderFlow.clear();
  });

  afterEach(() => {
    watchedFolderFlow.clear();
    vi.unstubAllGlobals();
  });

  it("ignores a cancelled picker", async () => {
    vi.stubGlobal("pond", {
      query: vi.fn(async () => ({ ok: false, path: null })),
    });
    await pickWatchedFolder();
    expect(watchedFolderRevision()).toBe(0);
  });

  it("refreshes after choosing a folder", async () => {
    vi.stubGlobal("pond", {
      query: vi.fn(async () => ({ ok: true, path: "/Users/raphael/Inbox" })),
    });
    await pickWatchedFolder();
    expect(watchedFolderRevision()).toBe(1);
  });
});
