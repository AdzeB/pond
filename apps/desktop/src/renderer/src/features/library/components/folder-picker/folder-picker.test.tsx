import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
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

it("creates a subfolder immediately and names it inline", async () => {
  pondQuery.mockImplementation(async (name, rawInput) => {
    const input = rawInput as
      | { id?: string; name?: string; parentId?: string | null }
      | undefined;
    if (name === "folders.create") {
      const created = folder("child", input?.parentId ?? null);
      created.name = input?.name ?? "Untitled";
      folderList.current.push(created);
      return created as never;
    }
    if (name === "folders.rename") {
      const created = folderList.current.find((row) => row.id === input?.id);
      if (created && input?.name) created.name = input.name;
      return { ok: true } as never;
    }
    if (name === "folders.list") return folderList.current as never;
    if (name === "folders.memberships") return [] as never;
    return { ok: true } as never;
  });
  const label = [...document.querySelectorAll("label")].find(
    (node) => node.textContent === "Alpha",
  );
  if (!(label?.parentElement instanceof HTMLDivElement))
    throw new Error("Missing Alpha row");

  await act(async () =>
    label.parentElement?.dispatchEvent(
      new MouseEvent("contextmenu", { bubbles: true, cancelable: true }),
    ),
  );
  const create = [
    ...document.querySelectorAll<HTMLElement>('[role="menuitem"]'),
  ].find((node) => node.textContent === "New Subfolder");
  if (!create) throw new Error("Missing New Subfolder action");
  await act(async () => create.click());

  await vi.waitFor(() =>
    expect(pondQuery).toHaveBeenCalledWith("folders.create", {
      name: "Untitled",
      parentId: "Alpha",
    }),
  );
  expect(document.querySelector('[role="alertdialog"]')).toBeNull();
  expect(
    document.querySelector('input[aria-label="Folder name"]'),
  ).not.toBeNull();
});
