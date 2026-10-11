import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it } from "vitest";
import { folders } from "../../../state/folders";
import {
  createFolderSidebarHarness,
  folder,
  folderList,
  pondQuery,
} from "../../folder-sidebar/test-harness";
import { MoveFoldersDialog } from ".";

const harness = createFolderSidebarHarness();
let host: HTMLDivElement;
let root: Root;

beforeEach(async () => {
  await harness.setup();
  folderList.current = [
    folder("Alpha"),
    folder("Child", "Alpha"),
    folder("Beta"),
  ];
  await folders.refresh();
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  await act(async () => {
    root.render(<MoveFoldersDialog ids={["Alpha"]} onClose={() => {}} />);
  });
});

afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
  await harness.cleanup();
});

function row(label: string) {
  const element = document.querySelector<HTMLElement>(
    `[role="treeitem"][aria-label="${label}"]`,
  );
  if (!element) throw new Error(`Missing row ${label}`);
  return element;
}

function moveButton() {
  const button = [...document.querySelectorAll("button")].find(
    (candidate) => candidate.textContent === "Move",
  );
  if (!button) throw new Error("Missing Move button");
  return button;
}

it("names the folder and blocks moving it into itself", async () => {
  expect(document.body.textContent).toContain('Move "Alpha"');
  expect(row("Alpha").getAttribute("aria-disabled")).toBe("true");
  expect(row("Child").getAttribute("aria-disabled")).toBe("true");
  await act(async () => row("Child").click());
  expect(moveButton().disabled).toBe(true);
});

it("moves the folder into the chosen destination", async () => {
  await act(async () => row("Beta").click());
  expect(row("Beta").getAttribute("aria-selected")).toBe("true");
  await act(async () => moveButton().click());
  expect(pondQuery).toHaveBeenCalledWith("folders.moveBatch", {
    ids: ["Alpha"],
    parentId: "Beta",
  });
});

it("keeps the top level unavailable when the folder is already there", async () => {
  await act(async () => row("Folders").click());
  expect(moveButton().disabled).toBe(true);
});
