import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import {
  closeRenameDialog,
  openRenameDialog,
} from "@/features/library/state/rename-dialog";
import { RenameDialogHost } from "./";

let root: Root;
let host: HTMLDivElement;
const query = vi.fn(async (name: string) =>
  name === "saves.batchRename" ? { ok: true, renamed: 1 } : [],
);

beforeEach(() => {
  query.mockClear();
  vi.stubGlobal("pond", { query });
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});

afterEach(async () => {
  await act(() => {
    closeRenameDialog();
    root.unmount();
  });
  host.remove();
  vi.unstubAllGlobals();
});

it("renames the selected saves with the entered pattern", async () => {
  await act(async () => {
    openRenameDialog(["save-a", "save-b"]);
    root.render(<RenameDialogHost />);
  });
  await vi.waitFor(() => {
    expect(document.querySelector('[role="dialog"]')).not.toBeNull();
  });

  const button = [...document.querySelectorAll("button")].find(
    (node) => node.textContent === "Rename",
  );
  if (!button) throw new Error("Missing Rename button");
  await act(async () => button.click());

  expect(query).toHaveBeenCalledWith("saves.batchRename", {
    ids: ["save-a", "save-b"],
    pattern: "{title} {n}",
  });
  await vi.waitFor(() => {
    expect(document.querySelector('[role="dialog"]')).toBeNull();
  });
});
