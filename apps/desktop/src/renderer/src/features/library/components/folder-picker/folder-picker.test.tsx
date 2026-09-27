import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it } from "vitest";
import { closeFolderPicker, openFolderPicker } from "../../state/folder-picker";
import { folders } from "../../state/folders";
import {
  createFolderSidebarHarness,
  folder,
  folderList,
  pondQuery,
} from "../folder-sidebar/test-harness";
import { FolderPickerHost } from ".";

const harness = createFolderSidebarHarness();
let host: HTMLDivElement;
let root: Root;
beforeEach(async () => {
  await harness.setup();
  folderList.current = [folder("Alpha"), folder("Beta"), folder("Gamma")];
  await folders.refresh();
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  await act(async () => {
    openFolderPicker(["save-1"]);
    root.render(<FolderPickerHost />);
  });
});
afterEach(async () => {
  await act(async () => {
    closeFolderPicker();
    root.unmount();
  });
  host.remove();
  await harness.cleanup();
});
function control(label: string) {
  const element = document.querySelector<HTMLElement>(
    `[aria-label="${label}"]`,
  );
  if (!element) throw new Error(`Missing control ${label}`);
  return element;
}
async function key(
  label: string,
  key: string,
  modifiers: KeyboardEventInit = {},
) {
  await act(async () =>
    control(label).dispatchEvent(
      new KeyboardEvent("keydown", {
        bubbles: true,
        cancelable: true,
        key,
        ...modifiers,
      }),
    ),
  );
}
it("moves from search through destinations and back without tabbing every checkbox", async () => {
  await key("Search folders", "ArrowDown");
  expect(document.activeElement).toBe(control("Alpha"));
  await key("Alpha", "ArrowDown");
  expect(document.activeElement).toBe(control("Beta"));
  await key("Beta", "End");
  expect(document.activeElement).toBe(control("Gamma"));
  await key("Gamma", "Home");
  expect(document.activeElement).toBe(control("Alpha"));
  await key("Alpha", "ArrowUp");
  expect(document.activeElement).toBe(control("Search folders"));
});
it("applies staged destinations with Command Enter and ignores IME arrow events", async () => {
  await key("Search folders", "ArrowDown", { isComposing: true });
  expect(document.activeElement).not.toBe(control("Alpha"));
  await act(async () => control("Beta").click());
  await key("Beta", "Enter", { metaKey: true });
  expect(pondQuery).toHaveBeenCalledWith("folders.assign", {
    saveIds: ["save-1"],
    addIds: ["Beta"],
    removeIds: [],
  });
});
