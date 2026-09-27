import { act } from "react";
import { afterEach, beforeEach, expect, it } from "vitest";
import {
  createFolderSidebarHarness,
  folder,
  folderList,
} from "../components/folder-sidebar/test-harness";
import { folders } from "../state/folders";
import { libraryChrome } from "../state/library-chrome";
import { getViewState } from "../state/view-store";
import { enterFolder, enterFolders } from "./enter-folder";

const harness = createFolderSidebarHarness();
beforeEach(async () => {
  await harness.setup();
  folderList.current = [
    folder("Alpha"),
    folder("Child", "Alpha"),
    folder("Beta"),
  ];
  await folders.refresh();
});
afterEach(() => harness.cleanup());

it("opens a deduplicated union of selected folders and descendants", () => {
  enterFolders(["Alpha", "Child", "Beta"], true);
  expect(libraryChrome.getState().nav).toEqual({ kind: "all" });
  expect(getViewState().query.rules).toEqual([
    { field: "folder", operator: "some", value: ["Alpha", "Child", "Beta"] },
  ]);
});

it("excludes descendants when opening selected folders without subfolders", () => {
  enterFolders(["Alpha", "Beta"], false);
  expect(getViewState().query.rules).toEqual([
    { field: "folder", operator: "some", value: ["Alpha", "Beta"] },
  ]);
});

it("clears a folder selection and returns to all Saves", () => {
  enterFolder("Alpha");
  enterFolders([], true);
  expect(getViewState().query.rules).toHaveLength(0);
  expect(libraryChrome.getState().nav).toEqual({ kind: "all" });
});

it.each(["/sources", "/downloads"])(
  "returns to the Library when entering a folder from %s",
  async (path) => {
    const router = await harness.mount(path);
    await act(async () => enterFolder("Alpha"));
    expect(router.state.location.pathname).toBe("/");
    expect(libraryChrome.getState().nav).toEqual({
      kind: "folder",
      id: "Alpha",
    });
    await act(async () => enterFolders([], true));
    expect(router.state.location.pathname).toBe("/");
    expect(libraryChrome.getState().nav).toEqual({ kind: "all" });
  },
);
